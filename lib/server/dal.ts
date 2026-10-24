import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { lookupSession, type SessionUser } from "@/lib/auth/service";
import { readSessionToken } from "./session";

/**
 * Data access layer: every page, server action and route handler asks here who is signed in.
 * The cookie is only an opaque random token. This looks it up in the database, so a revoked or
 * expired session stops working immediately.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  return lookupSession(getDb(), await readSessionToken());
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Signed in and email confirmed. Unconfirmed accounts go to the confirmation page. */
export async function requireVerifiedUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.emailVerifiedAt) redirect("/verify");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireVerifiedUser();
  if (user.role !== "admin") redirect("/app");
  return user;
}
