import { and, eq, lt, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { runs } from "@/db/schema";
import { emit } from "./events";

/**
 * Takes the oldest ready run for this worker. `FOR UPDATE SKIP LOCKED` means two workers asking at the same
 * moment get different runs, never the same one. At most `maxDeep` deep-research scripts run at once so
 * TinyFish's concurrency limit (5 research runs by default) is not exceeded.
 */
export async function claimNext(db: Db, workerId: string, maxDeep = 2): Promise<string | null> {
  return db.transaction(async (tx) => {
    const deepRunning = (
      await tx.select({ n: sql<number>`count(*)::int` }).from(runs).where(and(eq(runs.status, "running"), eq(runs.depth, "deep")))
    )[0].n;
    const standardOnly = deepRunning >= maxDeep ? sql`and depth = 'standard'` : sql``;
    const picked = await tx.execute<{ id: string }>(sql`
      select id from runs
      where status = 'queued' and available_at <= now() ${standardOnly}
      order by created_at
      limit 1
      for update skip locked
    `);
    const id = picked.rows[0]?.id;
    if (!id) return null;
    await tx
      .update(runs)
      .set({
        status: "running",
        workerId,
        heartbeatAt: new Date(),
        startedAt: sql`coalesce(${runs.startedAt}, now())`,
        attempts: sql`${runs.attempts} + 1`,
      })
      .where(eq(runs.id, id));
    return id;
  });
}

/** Puts back runs whose worker stopped sending heartbeats (crash, power loss, killed container). */
export async function recoverStale(db: Db, staleAfterMs = 120_000): Promise<number> {
  const cutoff = new Date(Date.now() - staleAfterMs);
  const rows = await db
    .update(runs)
    .set({ status: "queued", workerId: null, availableAt: new Date() })
    .where(and(eq(runs.status, "running"), lt(runs.heartbeatAt, cutoff)))
    .returning({ id: runs.id });
  for (const r of rows) await emit(db, r.id, "warn", "The writer restarted. Picking this script back up.");
  return rows.length;
}

/** Hands a run back during a clean shutdown. Does not count as a failed attempt. */
export async function releaseRun(db: Db, runId: string, workerId: string) {
  await db
    .update(runs)
    .set({ status: "queued", workerId: null, availableAt: new Date(), attempts: sql`greatest(${runs.attempts} - 1, 0)` })
    .where(and(eq(runs.id, runId), eq(runs.status, "running"), eq(runs.workerId, workerId)));
}
