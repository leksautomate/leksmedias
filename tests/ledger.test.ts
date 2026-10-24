import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { InsufficientCreditsError, getBalance, grantCredits, ledgerSum, refundRun, spendCredits } from "@/lib/core/ledger";
import { closeDb, db, makeUser, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(closeDb);

describe("credit ledger", () => {
  it("grants and spends, keeping balance and ledger in step", async () => {
    const u = await makeUser();
    expect((await grantCredits(db, { userId: u.id, amount: 1000 })).balance).toBe(1000);
    expect((await spendCredits(db, { userId: u.id, amount: 150 })).balance).toBe(850);
    expect(await getBalance(db, u.id)).toBe(850);
    expect(await ledgerSum(db, u.id)).toBe(850);
  });

  it("refuses to overdraw and leaves nothing behind", async () => {
    const u = await makeUser();
    await grantCredits(db, { userId: u.id, amount: 100 });
    await expect(spendCredits(db, { userId: u.id, amount: 101 })).rejects.toBeInstanceOf(InsufficientCreditsError);
    expect(await getBalance(db, u.id)).toBe(100);
    expect(await ledgerSum(db, u.id)).toBe(100);
  });

  it("cannot be overdrawn by parallel spends", async () => {
    const u = await makeUser();
    await grantCredits(db, { userId: u.id, amount: 1000 });
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () => spendCredits(db, { userId: u.id, amount: 150 })),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const rejected = results.filter(
      (r) => r.status === "rejected" && r.reason instanceof InsufficientCreditsError,
    ).length;
    expect(ok).toBe(6); // 6 x 150 = 900 of 1000
    expect(rejected).toBe(6);
    expect(await getBalance(db, u.id)).toBe(100);
    expect(await ledgerSum(db, u.id)).toBe(100);
  });

  it("treats a repeated grant with the same key as one grant", async () => {
    const u = await makeUser();
    const a = await grantCredits(db, { userId: u.id, amount: 300, kind: "plan_grant", idempotencyKey: "signup:" + u.id });
    const b = await grantCredits(db, { userId: u.id, amount: 300, kind: "plan_grant", idempotencyKey: "signup:" + u.id });
    expect(a.applied).toBe(true);
    expect(b.applied).toBe(false);
    expect(await getBalance(db, u.id)).toBe(300);
  });

  it("applies the same idempotent grant once even when called in parallel", async () => {
    const u = await makeUser();
    await Promise.all(
      Array.from({ length: 8 }, () =>
        grantCredits(db, { userId: u.id, amount: 300, kind: "plan_grant", idempotencyKey: "same" }),
      ),
    );
    expect(await getBalance(db, u.id)).toBe(300);
    expect(await ledgerSum(db, u.id)).toBe(300);
  });

  it("refunds a run once, however many times it is asked", async () => {
    const u = await makeUser();
    await grantCredits(db, { userId: u.id, amount: 1000 });
    const runId = "11111111-1111-4111-8111-111111111111";
    await spendCredits(db, { userId: u.id, amount: 600, runId });
    const first = await refundRun(db, runId);
    const second = await refundRun(db, runId);
    expect(first.refunded).toBe(600);
    expect(second.refunded).toBe(0);
    expect(await getBalance(db, u.id)).toBe(1000);
    expect(await ledgerSum(db, u.id)).toBe(1000);
  });

  it("does nothing when refunding a run that never spent credits", async () => {
    expect(await refundRun(db, "22222222-2222-4222-8222-222222222222")).toEqual({ refunded: 0, balance: null });
  });

  it("rolls back the spend if the surrounding transaction fails", async () => {
    const u = await makeUser();
    await grantCredits(db, { userId: u.id, amount: 500 });
    await expect(
      db.transaction(async (tx) => {
        await spendCredits(tx, { userId: u.id, amount: 200 });
        throw new Error("run insert failed");
      }),
    ).rejects.toThrow("run insert failed");
    expect(await getBalance(db, u.id)).toBe(500);
    expect(await ledgerSum(db, u.id)).toBe(500);
  });

  it("rejects zero, negative and fractional amounts", async () => {
    const u = await makeUser();
    await expect(grantCredits(db, { userId: u.id, amount: 0 })).rejects.toThrow(RangeError);
    await expect(grantCredits(db, { userId: u.id, amount: -5 })).rejects.toThrow(RangeError);
    await expect(spendCredits(db, { userId: u.id, amount: 1.5 })).rejects.toThrow(RangeError);
  });
});
