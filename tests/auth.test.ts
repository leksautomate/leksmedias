import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { emailTokens, sessions, users } from "@/db/schema";
import { checkPasswordPolicy, hashPassword, verifyPassword } from "@/lib/auth/password";
import { sentMail } from "@/lib/auth/mailer";
import {
  confirmEmail,
  destroySession,
  login,
  lookupSession,
  requestPasswordReset,
  resetPassword,
  signup,
} from "@/lib/auth/service";
import { getBalance, ledgerSum } from "@/lib/core/ledger";
import { closeDb, db, resetDb } from "./helpers";

const GOOD = "correct horse battery 42";
const tokenFrom = (link?: string) => new URL(link!).searchParams.get("token")!;

beforeEach(async () => {
  await resetDb();
  sentMail.length = 0;
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterAll(closeDb);

describe("passwords", () => {
  it("hashes with a random salt and verifies", async () => {
    const a = await hashPassword(GOOD);
    const b = await hashPassword(GOOD);
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword(GOOD, a)).toBe(true);
    expect(await verifyPassword(GOOD + "x", a)).toBe(false);
    expect(await verifyPassword(GOOD, "garbage")).toBe(false);
  });
  it("enforces the policy", () => {
    expect(checkPasswordPolicy("short", "a@b.co")).toMatch(/10 characters/);
    expect(checkPasswordPolicy("aaaaaaaaaaaa", "a@b.co")).toMatch(/repetitive/);
    expect(checkPasswordPolicy("lekan-password-1", "lekan@x.com")).toMatch(/email name/);
    expect(checkPasswordPolicy("password123", "a@b.co")).toBeTruthy(); // too short anyway
    expect(checkPasswordPolicy("1234567890", "a@b.co")).toMatch(/common/);
    expect(checkPasswordPolicy(GOOD, "a@b.co")).toBeNull();
  });
});

describe("signup and email confirmation", () => {
  it("creates an unverified account with no credits and sends a link", async () => {
    const r = await signup(db, { email: "  New@Example.com ", password: GOOD, name: "New" });
    expect(r.ok).toBe(true);
    const u = (await db.select().from(users))[0];
    expect(u.email).toBe("new@example.com");
    expect(u.emailVerifiedAt).toBeNull();
    expect(u.creditBalance).toBe(0);
    expect(u.passwordHash).not.toContain(GOOD);
    expect(sentMail).toHaveLength(1);
    expect(sentMail[0].text).toContain("/verify?token=");
  });

  it("rejects a weak password and creates nothing", async () => {
    const r = await signup(db, { email: "a@example.com", password: "short" });
    expect(r.ok).toBe(false);
    expect(await db.select().from(users)).toHaveLength(0);
  });

  it("stores only a hash of the verification token", async () => {
    const r = await signup(db, { email: "a@example.com", password: GOOD });
    const token = tokenFrom(r.ok ? r.devLink : undefined);
    const rows = await db.select().from(emailTokens);
    expect(rows[0].tokenHash).not.toBe(token);
    expect(rows[0].tokenHash).toHaveLength(64);
  });

  it("gives the free credits once, on confirmation", async () => {
    const r = await signup(db, { email: "a@example.com", password: GOOD });
    const token = tokenFrom(r.ok ? r.devLink : undefined);
    expect((await confirmEmail(db, token)).ok).toBe(true);
    const u = (await db.select().from(users))[0];
    expect(u.emailVerifiedAt).not.toBeNull();
    expect(await getBalance(db, u.id)).toBe(300);
    expect(await ledgerSum(db, u.id)).toBe(300);
    // the same link cannot be used again
    expect((await confirmEmail(db, token)).ok).toBe(false);
    expect(await getBalance(db, u.id)).toBe(300);
  });

  it("gives credits once even if the link is opened twice at the same moment", async () => {
    const r = await signup(db, { email: "a@example.com", password: GOOD });
    const token = tokenFrom(r.ok ? r.devLink : undefined);
    await Promise.all([confirmEmail(db, token), confirmEmail(db, token), confirmEmail(db, token)]);
    const u = (await db.select().from(users))[0];
    expect(await getBalance(db, u.id)).toBe(300);
  });

  it("rejects unknown and expired links", async () => {
    expect((await confirmEmail(db, "nope-nope-nope-nope-nope-nope")).ok).toBe(false);
    const r = await signup(db, { email: "a@example.com", password: GOOD });
    const token = tokenFrom(r.ok ? r.devLink : undefined);
    await db.update(emailTokens).set({ expiresAt: new Date(Date.now() - 1000) });
    expect((await confirmEmail(db, token)).ok).toBe(false);
  });

  it("does not reveal that an email is already registered", async () => {
    await signup(db, { email: "a@example.com", password: GOOD });
    sentMail.length = 0;
    const again = await signup(db, { email: "A@example.com", password: "another long password 9" });
    expect(again).toEqual({ ok: true });
    expect(await db.select().from(users)).toHaveLength(1);
    expect(sentMail).toHaveLength(1);
    expect(sentMail[0].subject).toMatch(/already have/);
  });

  it("handles two simultaneous signups for one email", async () => {
    const results = await Promise.all([
      signup(db, { email: "race@example.com", password: GOOD }),
      signup(db, { email: "race@example.com", password: GOOD }),
    ]);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(await db.select().from(users)).toHaveLength(1);
  });
});

describe("login and sessions", () => {
  async function account() {
    const r = await signup(db, { email: "a@example.com", password: GOOD });
    await confirmEmail(db, tokenFrom(r.ok ? r.devLink : undefined));
  }

  it("logs in and finds the user from the cookie token", async () => {
    await account();
    const r = await login(db, { email: "A@example.com", password: GOOD, ip: "1.1.1.1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verified).toBe(true);
    const rows = await db.select().from(sessions);
    expect(rows[0].tokenHash).not.toBe(r.token); // never stored in the clear
    const user = await lookupSession(db, r.token);
    expect(user?.email).toBe("a@example.com");
    expect(user?.creditBalance).toBe(300);
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("gives the same error for a wrong password and an unknown email", async () => {
    await account();
    const wrong = await login(db, { email: "a@example.com", password: "wrong wrong wrong", ip: "2.2.2.2" });
    const unknown = await login(db, { email: "nobody@example.com", password: GOOD, ip: "2.2.2.2" });
    expect(wrong).toEqual({ ok: false, error: "That email and password do not match." });
    expect(unknown).toEqual(wrong);
  });

  it("blocks a client after repeated failures, even with the right password", async () => {
    await account();
    for (let i = 0; i < 8; i++) await login(db, { email: "a@example.com", password: "bad bad bad bad", ip: "3.3.3.3" });
    const blocked = await login(db, { email: "a@example.com", password: GOOD, ip: "3.3.3.3" });
    expect(blocked.ok).toBe(false);
    expect(!blocked.ok && blocked.error).toMatch(/Too many attempts/);
    // a different address is not affected
    expect((await login(db, { email: "a@example.com", password: GOOD, ip: "4.4.4.4" })).ok).toBe(true);
  });

  it("rejects bad, expired and signed-out tokens", async () => {
    await account();
    const r = await login(db, { email: "a@example.com", password: GOOD, ip: "5.5.5.5" });
    if (!r.ok) throw new Error("login failed");
    expect(await lookupSession(db, undefined)).toBeNull();
    expect(await lookupSession(db, "short")).toBeNull();
    expect(await lookupSession(db, "x".repeat(43))).toBeNull();
    await destroySession(db, r.token);
    expect(await lookupSession(db, r.token)).toBeNull();
    const r2 = await login(db, { email: "a@example.com", password: GOOD, ip: "5.5.5.5" });
    if (!r2.ok) throw new Error("login failed");
    await db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) });
    expect(await lookupSession(db, r2.token)).toBeNull();
  });

  it("refuses disabled accounts", async () => {
    await account();
    await db.update(users).set({ disabledAt: new Date() });
    expect((await login(db, { email: "a@example.com", password: GOOD, ip: "6.6.6.6" })).ok).toBe(false);
  });

  it("lets an unverified user sign in but reports it", async () => {
    await signup(db, { email: "u@example.com", password: GOOD });
    const r = await login(db, { email: "u@example.com", password: GOOD, ip: "7.7.7.7" });
    expect(r.ok && r.verified).toBe(false);
  });
});

describe("password reset", () => {
  it("does nothing visible for an unknown email", async () => {
    expect(await requestPasswordReset(db, "ghost@example.com")).toEqual({});
    expect(sentMail).toHaveLength(0);
  });

  it("resets once, signs out every session and accepts the new password", async () => {
    const r = await signup(db, { email: "a@example.com", password: GOOD });
    await confirmEmail(db, tokenFrom(r.ok ? r.devLink : undefined));
    const session = await login(db, { email: "a@example.com", password: GOOD, ip: "8.8.8.8" });
    if (!session.ok) throw new Error("login failed");

    const { devLink } = await requestPasswordReset(db, "a@example.com");
    const token = tokenFrom(devLink);
    const NEW = "a brand new passphrase 77";
    expect(await resetPassword(db, token, NEW)).toEqual({ ok: true });
    expect(await lookupSession(db, session.token)).toBeNull();
    expect((await login(db, { email: "a@example.com", password: GOOD, ip: "8.8.8.8" })).ok).toBe(false);
    expect((await login(db, { email: "a@example.com", password: NEW, ip: "8.8.8.8" })).ok).toBe(true);
    expect((await resetPassword(db, token, "yet another passphrase 88")).ok).toBe(false);
  });

  it("applies the password policy and keeps the link usable after a weak attempt", async () => {
    const r = await signup(db, { email: "a@example.com", password: GOOD });
    expect(r.ok).toBe(true);
    const { devLink } = await requestPasswordReset(db, "a@example.com");
    const token = tokenFrom(devLink);
    expect((await resetPassword(db, token, "short")).ok).toBe(false);
    expect((await resetPassword(db, token, "a perfectly fine passphrase")).ok).toBe(true);
  });

  it("lets only one of several simultaneous resets win", async () => {
    await signup(db, { email: "a@example.com", password: GOOD });
    const { devLink } = await requestPasswordReset(db, "a@example.com");
    const token = tokenFrom(devLink);
    const res = await Promise.all(
      ["first passphrase here 1", "second passphrase here 2", "third passphrase here 3"].map((p) => resetPassword(db, token, p)),
    );
    expect(res.filter((r) => r.ok)).toHaveLength(1);
  });

  it("rejects expired links", async () => {
    await signup(db, { email: "a@example.com", password: GOOD });
    const { devLink } = await requestPasswordReset(db, "a@example.com");
    await db.update(emailTokens).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(emailTokens.purpose, "reset"));
    expect((await resetPassword(db, tokenFrom(devLink), "a perfectly fine passphrase")).ok).toBe(false);
  });
});
