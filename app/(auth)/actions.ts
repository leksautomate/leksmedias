"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import {
  confirmEmail,
  createSession,
  destroySession,
  login,
  requestPasswordReset,
  resetPassword,
  sendVerification,
  signup,
} from "@/lib/auth/service";
import { isConsoleMail } from "@/lib/auth/mailer";
import { getCurrentUser } from "@/lib/server/dal";
import { clearSessionCookie, clientIp, readSessionToken, setSessionCookie, userAgent } from "@/lib/server/session";
import { emailTokens } from "@/db/schema";
import { and, desc, eq, gt } from "drizzle-orm";

// email and name are sent back on errors so the form can keep them. React 19 clears uncontrolled fields after an action.
export type FormState = { error?: string; message?: string; devLink?: string; done?: boolean; email?: string; name?: string };

const Email = z.email("Enter a valid email address.").max(254);

function safeNext(raw: FormDataEntryValue | null): string {
  const next = typeof raw === "string" ? raw : "";
  // Only same-site paths. Blocks "//evil.com" and "https://evil.com".
  return next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/app";
}

export async function signupAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({
      email: Email,
      password: z.string().min(1, "Choose a password."),
      name: z.string().max(80).optional(),
      terms: z.literal("on", "Please accept the Terms and Privacy Policy to continue."),
      company: z.string().max(0).optional(), // honeypot
    })
    .safeParse({
      email: form.get("email"),
      password: form.get("password"),
      name: form.get("name") || undefined,
      terms: form.get("terms") ?? undefined,
      company: form.get("company") || undefined,
    });
  if (!parsed.success) {
    // A filled honeypot looks like success so bots do not learn anything.
    if (form.get("company")) return { done: true, message: "Check your email to confirm your address." };
    return { error: parsed.error.issues[0].message, email: String(form.get("email") ?? ""), name: String(form.get("name") ?? "") };
  }
  const r = await signup(getDb(), {
    email: parsed.data.email,
    password: parsed.data.password,
    name: parsed.data.name,
    acceptedTerms: true,
  });
  if (!r.ok) return { error: r.error, email: parsed.data.email, name: parsed.data.name };
  return {
    done: true,
    message: `We sent a confirmation link to ${parsed.data.email.trim().toLowerCase()}. Open it to unlock your free credits.`,
    devLink: r.devLink,
  };
}

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ email: Email, password: z.string().min(1).max(200) }).safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: "Enter your email and password.", email: String(form.get("email") ?? "") };
  const r = await login(getDb(), { ...parsed.data, ip: await clientIp(), userAgent: await userAgent() });
  if (!r.ok) return { error: r.error, email: parsed.data.email };
  await setSessionCookie(r.token, r.expiresAt);
  redirect(r.verified ? safeNext(form.get("next")) : "/verify");
}

export async function logoutAction() {
  await destroySession(getDb(), await readSessionToken());
  await clearSessionCookie();
  redirect("/");
}

export async function confirmEmailAction(_prev: FormState, form: FormData): Promise<FormState> {
  const token = form.get("token");
  if (typeof token !== "string" || token.length < 20) return { error: "This link is invalid." };
  const db = getDb();
  const r = await confirmEmail(db, token);
  if (!r.ok || !r.userId) return { error: r.error ?? "This link is invalid or has expired." };
  // Opening the link proves control of the inbox, so sign them in.
  const s = await createSession(db, r.userId, await clientIp(), await userAgent());
  await setSessionCookie(s.token, s.expiresAt);
  redirect("/app?welcome=1");
}

export async function resendVerificationAction(): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.emailVerifiedAt) redirect("/app");
  const db = getDb();
  // One new link per minute.
  const recent = await db
    .select({ id: emailTokens.id })
    .from(emailTokens)
    .where(and(eq(emailTokens.userId, user.id), eq(emailTokens.purpose, "verify"), gt(emailTokens.createdAt, new Date(Date.now() - 60_000))))
    .orderBy(desc(emailTokens.createdAt))
    .limit(1);
  if (recent.length) return { error: "We just sent one. Give it a minute, then check your spam folder." };
  const link = await sendVerification(db, user.id, user.email);
  return { done: true, message: `A new link is on its way to ${user.email}.`, devLink: isConsoleMail() ? link : undefined };
}

export async function forgotAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = Email.safeParse(form.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message, email: String(form.get("email") ?? "") };
  const r = await requestPasswordReset(getDb(), parsed.data);
  return { done: true, message: "If that email has an account, a reset link is on its way.", devLink: r.devLink };
}

export async function resetAction(_prev: FormState, form: FormData): Promise<FormState> {
  const token = form.get("token");
  const password = form.get("password");
  if (typeof token !== "string" || typeof password !== "string") return { error: "Something went wrong. Request a new link." };
  const r = await resetPassword(getDb(), token, password);
  if (!r.ok) return { error: r.error };
  redirect("/login?reset=1");
}
