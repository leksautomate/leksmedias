import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { authAttempts, emailTokens, sessions, users } from "@/db/schema";
import type { Db } from "@/db";
import { grantCredits } from "@/lib/core/ledger";
import { PLANS } from "@/lib/pricing";
import { SITE } from "@/lib/site";
import { isConsoleMail, sendMail } from "./mailer";
import { checkPasswordPolicy, dummyHash, hashPassword, verifyPassword } from "./password";
import { normalizeEmail, randomToken, sha256 } from "./tokens";

export const SESSION_DAYS = 30;
const VERIFY_HOURS = 24;
const RESET_HOURS = 2;
const MAX_FAILS = 8;
const WINDOW_MIN = 15;

const FREE_PLAN = PLANS.find((p) => p.id === "free")!;
const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? SITE.url).replace(/\/$/, "");

/** Drizzle wraps driver errors, so the Postgres code can be on the error or on its cause. */
export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

/* ------------------------------------------------------------------ signup */

export type SignupResult =
  | { ok: true; devLink?: string }
  | { ok: false; error: string };

/**
 * Creates an account and emails a verification link. If the email already has an account we say the same
 * thing on screen and email the owner instead, so the form cannot be used to discover who is registered.
 */
export async function signup(
  db: Db,
  input: { email: string; password: string; name?: string; acceptedTerms?: boolean },
): Promise<SignupResult> {
  const email = normalizeEmail(input.email);
  const policy = checkPasswordPolicy(input.password, email);
  if (policy) return { ok: false, error: policy };

  const existing = (await db.select({ id: users.id, verified: users.emailVerifiedAt }).from(users).where(eq(users.email, email)).limit(1))[0];
  if (existing) {
    await sendMail({
      to: email,
      subject: `You already have a ${SITE.name} account`,
      text: `Someone tried to create a ${SITE.name} account with this email address, but you already have one.\n\nSign in: ${siteUrl()}/login\nForgot your password? ${siteUrl()}/forgot\n\nIf this was not you, you can ignore this message.`,
    });
    return { ok: true };
  }

  const passwordHash = await hashPassword(input.password);
  let userId: string;
  try {
    const [u] = await db
      .insert(users)
      .values({ email, passwordHash, name: input.name?.trim() || null, termsAcceptedAt: input.acceptedTerms ? new Date() : null })
      .returning({ id: users.id });
    userId = u.id;
  } catch (err) {
    // Two signups for the same email at once: the second loses the race and behaves like "already exists".
    if (isUniqueViolation(err)) return { ok: true };
    throw err;
  }
  const link = await sendVerification(db, userId, email);
  return { ok: true, devLink: isConsoleMail() ? link : undefined };
}

export async function sendVerification(db: Db, userId: string, email: string): Promise<string> {
  const token = randomToken();
  await db.insert(emailTokens).values({
    userId,
    purpose: "verify",
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + VERIFY_HOURS * 3600_000),
  });
  const link = `${siteUrl()}/verify?token=${token}`;
  await sendMail({
    to: email,
    subject: `Confirm your email for ${SITE.name}`,
    text: `Welcome to ${SITE.name}.\n\nConfirm your email to unlock your free credits:\n${link}\n\nThe link works for ${VERIFY_HOURS} hours. If you did not sign up, ignore this message.`,
  });
  return link;
}

/** Marks the email verified and gives the free trial credits once. */
export async function confirmEmail(db: Db, token: string): Promise<{ ok: boolean; error?: string; userId?: string }> {
  const row = (
    await db
      .select()
      .from(emailTokens)
      .where(and(eq(emailTokens.tokenHash, sha256(token)), eq(emailTokens.purpose, "verify")))
      .limit(1)
  )[0];
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return { ok: false, error: "This link is invalid or has expired. Sign in to get a new one." };
  }
  await db.transaction(async (tx) => {
    const claimed = await tx
      .update(emailTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(emailTokens.id, row.id), isNull(emailTokens.usedAt)))
      .returning({ id: emailTokens.id });
    if (claimed.length === 0) return; // someone else just used it
    await tx.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, row.userId));
    await grantCredits(tx, {
      userId: row.userId,
      amount: FREE_PLAN.credits,
      kind: "plan_grant",
      note: "Free trial credits",
      idempotencyKey: `free-trial:${row.userId}`,
    });
  });
  return { ok: true, userId: row.userId };
}

/* ------------------------------------------------------------------- login */

export type LoginResult =
  | { ok: true; userId: string; token: string; expiresAt: Date; verified: boolean }
  | { ok: false; error: string };

const attemptKey = (ip: string, email: string) => sha256(`${ip}|${email}`);

async function recentFailures(db: Db, key: string): Promise<number> {
  const since = new Date(Date.now() - WINDOW_MIN * 60_000);
  const r = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(authAttempts)
    .where(and(eq(authAttempts.key, key), eq(authAttempts.success, false), gt(authAttempts.at, since)));
  return r[0].n;
}

export async function login(
  db: Db,
  input: { email: string; password: string; ip: string; userAgent?: string | null },
): Promise<LoginResult> {
  const email = normalizeEmail(input.email);
  const key = attemptKey(input.ip, email);
  if ((await recentFailures(db, key)) >= MAX_FAILS) {
    return { ok: false, error: `Too many attempts. Try again in ${WINDOW_MIN} minutes.` };
  }

  const user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  // Always run one scrypt so an unknown email takes as long as a wrong password.
  const valid = await verifyPassword(input.password, user?.passwordHash ?? (await dummyHash()));
  if (!user || !valid || user.disabledAt) {
    await db.insert(authAttempts).values({ key, success: false });
    return { ok: false, error: "That email and password do not match." };
  }
  await db.insert(authAttempts).values({ key, success: true });
  const s = await createSession(db, user.id, input.ip, input.userAgent);
  return { ok: true, userId: user.id, token: s.token, expiresAt: s.expiresAt, verified: !!user.emailVerifiedAt };
}

/* ---------------------------------------------------------------- sessions */

export async function createSession(db: Db, userId: string, ip?: string | null, userAgent?: string | null) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({
    userId,
    tokenHash: sha256(token),
    expiresAt,
    ip: ip ?? null,
    userAgent: userAgent?.slice(0, 300) ?? null,
  });
  return { token, expiresAt };
}

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  role: string;
  creditBalance: number;
  emailVerifiedAt: Date | null;
};

/** Finds the user for a cookie token. Extends the session at most once an hour. Returns null if invalid. */
export async function lookupSession(db: Db, token: string | undefined): Promise<SessionUser | null> {
  if (!token || token.length < 20) return null;
  const row = (
    await db
      .select({
        sid: sessions.id,
        lastSeenAt: sessions.lastSeenAt,
        id: users.id,
        email: users.email,
        name: users.name,
        plan: users.plan,
        role: users.role,
        creditBalance: users.creditBalance,
        emailVerifiedAt: users.emailVerifiedAt,
        disabledAt: users.disabledAt,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())))
      .limit(1)
  )[0];
  if (!row || row.disabledAt) return null;
  if (Date.now() - row.lastSeenAt.getTime() > 3600_000) {
    await db
      .update(sessions)
      .set({ lastSeenAt: new Date(), expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) })
      .where(eq(sessions.id, row.sid));
  }
  const { sid: _sid, lastSeenAt: _l, disabledAt: _d, ...user } = row;
  return user;
}

export async function destroySession(db: Db, token: string | undefined) {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
}

export async function purgeExpired(db: Db) {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  await db.delete(emailTokens).where(lt(emailTokens.expiresAt, new Date(Date.now() - 7 * 86_400_000)));
  await db.delete(authAttempts).where(lt(authAttempts.at, new Date(Date.now() - 86_400_000)));
}

/* ---------------------------------------------------------- password reset */

/** Always succeeds from the caller's point of view, so it cannot be used to find registered emails. */
export async function requestPasswordReset(db: Db, emailRaw: string): Promise<{ devLink?: string }> {
  const email = normalizeEmail(emailRaw);
  const user = (await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1))[0];
  if (!user) return {};
  const token = randomToken();
  await db.insert(emailTokens).values({
    userId: user.id,
    purpose: "reset",
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + RESET_HOURS * 3600_000),
  });
  const link = `${siteUrl()}/reset?token=${token}`;
  await sendMail({
    to: email,
    subject: `Reset your ${SITE.name} password`,
    text: `Use this link to choose a new password:\n${link}\n\nIt works for ${RESET_HOURS} hours and only once. If you did not ask for this, ignore this message. Your password has not changed.`,
  });
  return { devLink: isConsoleMail() ? link : undefined };
}

export async function resetPassword(db: Db, token: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  const row = (
    await db
      .select({ id: emailTokens.id, userId: emailTokens.userId, usedAt: emailTokens.usedAt, expiresAt: emailTokens.expiresAt, email: users.email })
      .from(emailTokens)
      .innerJoin(users, eq(users.id, emailTokens.userId))
      .where(and(eq(emailTokens.tokenHash, sha256(token)), eq(emailTokens.purpose, "reset")))
      .limit(1)
  )[0];
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return { ok: false, error: "This reset link is invalid or has expired. Request a new one." };
  }
  const policy = checkPasswordPolicy(newPassword, row.email);
  if (policy) return { ok: false, error: policy };
  const passwordHash = await hashPassword(newPassword);
  const used = await db.transaction(async (tx) => {
    const claimed = await tx
      .update(emailTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(emailTokens.id, row.id), isNull(emailTokens.usedAt)))
      .returning({ id: emailTokens.id });
    if (claimed.length === 0) return false; // another request used the link first
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, row.userId));
    // A reset signs the account out everywhere.
    await tx.delete(sessions).where(eq(sessions.userId, row.userId));
    return true;
  });
  if (!used) return { ok: false, error: "This reset link was already used. Request a new one." };
  return { ok: true };
}
