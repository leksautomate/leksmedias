import { createHash, randomBytes } from "node:crypto";

/** 32 random bytes as URL-safe text. This is what goes in a cookie or an email link. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Only the hash of a token is stored, so a database leak does not leak working sessions or links. */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
