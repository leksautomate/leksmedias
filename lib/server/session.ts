import "server-only";
import { cookies, headers } from "next/headers";

export const SESSION_COOKIE = "lk_session";

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/**
 * Client IP for rate limiting. Behind our reverse proxy (Caddy) the last entry of X-Forwarded-For is the
 * address the proxy saw, so earlier entries (which a client can fake) are ignored.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",").pop()!.trim() || "unknown";
  return h.get("x-real-ip") ?? "unknown";
}

export async function userAgent(): Promise<string | null> {
  return (await headers()).get("user-agent");
}
