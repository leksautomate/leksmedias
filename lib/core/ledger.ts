import { and, desc, eq, sql } from "drizzle-orm";
import { creditLedger, users } from "@/db/schema";
import type { Db } from "@/db";

// Both a Db and a transaction have .transaction(); on a transaction it becomes a savepoint,
// so these functions can run on their own or inside a larger transaction (for example
// "reserve credits and create the run" as one atomic step).
type DbLike = Pick<Db, "transaction" | "select" | "execute" | "update" | "insert">;

export type LedgerKind = "grant" | "plan_grant" | "topup" | "spend" | "refund" | "adjust";

export class InsufficientCreditsError extends Error {
  constructor(
    public readonly needed: number,
    public readonly balance: number,
  ) {
    super(`Not enough credits: needs ${needed}, balance is ${balance}`);
    this.name = "InsufficientCreditsError";
  }
}

/** Locks the user's row for the rest of the transaction so balance changes happen one at a time. */
async function lockBalance(tx: DbLike, userId: string): Promise<number> {
  const rows = await tx
    .select({ balance: users.creditBalance })
    .from(users)
    .where(eq(users.id, userId))
    .for("update");
  if (rows.length === 0) throw new Error(`user ${userId} not found`);
  return rows[0].balance;
}

async function apply(
  tx: DbLike,
  userId: string,
  current: number,
  e: { kind: LedgerKind; amount: number; runId?: string | null; note?: string; idempotencyKey?: string },
): Promise<number> {
  const balanceAfter = current + e.amount;
  await tx
    .update(users)
    .set({ creditBalance: balanceAfter, updatedAt: new Date() })
    .where(eq(users.id, userId));
  await tx.insert(creditLedger).values({
    userId,
    kind: e.kind,
    amount: e.amount,
    balanceAfter,
    runId: e.runId ?? null,
    note: e.note ?? null,
    idempotencyKey: e.idempotencyKey ?? null,
  });
  return balanceAfter;
}

async function existingByKey(tx: DbLike, key: string) {
  const rows = await tx.select().from(creditLedger).where(eq(creditLedger.idempotencyKey, key)).limit(1);
  return rows[0];
}

/** Adds credits. Safe to retry when `idempotencyKey` is given: the second call does nothing. */
export async function grantCredits(
  db: DbLike,
  p: { userId: string; amount: number; kind?: Extract<LedgerKind, "grant" | "plan_grant" | "topup" | "adjust">; note?: string; idempotencyKey?: string },
): Promise<{ balance: number; applied: boolean }> {
  if (!Number.isInteger(p.amount) || p.amount <= 0) throw new RangeError("amount must be a positive integer");
  return db.transaction(async (tx) => {
    const current = await lockBalance(tx, p.userId);
    if (p.idempotencyKey) {
      const prev = await existingByKey(tx, p.idempotencyKey);
      if (prev) return { balance: current, applied: false };
    }
    const balance = await apply(tx, p.userId, current, {
      kind: p.kind ?? "grant",
      amount: p.amount,
      note: p.note,
      idempotencyKey: p.idempotencyKey,
    });
    return { balance, applied: true };
  });
}

/** Takes credits for a run. Throws InsufficientCreditsError instead of going below zero. */
export async function spendCredits(
  db: DbLike,
  p: { userId: string; amount: number; runId?: string; note?: string },
): Promise<{ balance: number }> {
  if (!Number.isInteger(p.amount) || p.amount <= 0) throw new RangeError("amount must be a positive integer");
  return db.transaction(async (tx) => {
    const current = await lockBalance(tx, p.userId);
    if (current < p.amount) throw new InsufficientCreditsError(p.amount, current);
    const balance = await apply(tx, p.userId, current, {
      kind: "spend",
      amount: -p.amount,
      runId: p.runId,
      note: p.note,
    });
    return { balance };
  });
}

/**
 * Returns what a run cost. Idempotent: refunding the same run twice only refunds once.
 * `keep` holds back part of the charge, used when a user cancels after paid research has already started.
 */
export async function refundRun(
  db: DbLike,
  runId: string,
  note = "Run did not finish",
  opts: { keep?: number } = {},
): Promise<{ refunded: number; balance: number | null }> {
  return db.transaction(async (tx) => {
    const spend = (
      await tx
        .select()
        .from(creditLedger)
        .where(and(eq(creditLedger.runId, runId), eq(creditLedger.kind, "spend")))
        .orderBy(desc(creditLedger.id))
        .limit(1)
    )[0];
    if (!spend) return { refunded: 0, balance: null };
    const current = await lockBalance(tx, spend.userId);
    const key = `refund:${runId}`;
    if (await existingByKey(tx, key)) return { refunded: 0, balance: current };
    const amount = Math.max(0, -spend.amount - Math.max(0, opts.keep ?? 0));
    if (amount === 0) return { refunded: 0, balance: current };
    const balance = await apply(tx, spend.userId, current, { kind: "refund", amount, runId, note, idempotencyKey: key });
    return { refunded: amount, balance };
  });
}

export async function getBalance(db: DbLike, userId: string): Promise<number> {
  const r = await db.select({ b: users.creditBalance }).from(users).where(eq(users.id, userId)).limit(1);
  return r[0]?.b ?? 0;
}

/** Sum of the ledger. Must always equal users.credit_balance. Used by tests and the admin health check. */
export async function ledgerSum(db: DbLike, userId: string): Promise<number> {
  const r = await db
    .select({ s: sql<number>`coalesce(sum(${creditLedger.amount}), 0)::int` })
    .from(creditLedger)
    .where(eq(creditLedger.userId, userId));
  return r[0].s;
}

