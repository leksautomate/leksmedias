import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { runs } from "@/db/schema";
import { MAX_WORDS, MIN_WORDS, planAllows, runCost } from "@/lib/core/credits";
import { InsufficientCreditsError, refundRun, spendCredits } from "@/lib/core/ledger";
import { FORMATS } from "@/lib/core/rules";
import { DEEP_RUN_CREDITS } from "@/lib/pricing";
import { providerEvents } from "@/db/schema";
import { emit } from "./events";

export const MAX_ACTIVE_RUNS = 3;

export const BriefSchema = z.object({
  topic: z.string().trim().min(10, "Describe the topic in at least 10 characters.").max(500, "Keep the topic under 500 characters."),
  format: z.enum(FORMATS.map((f) => f.id) as [string, ...string[]]),
  niche: z.string().trim().max(80).optional(),
  words: z.number().int().min(MIN_WORDS, `Scripts start at ${MIN_WORDS} words.`).max(MAX_WORDS, `Scripts go up to ${MAX_WORDS.toLocaleString("en-US")} words.`),
  depth: z.enum(["standard", "deep"]),
  voiceNotes: z.string().trim().max(1000).optional(),
  language: z.string().trim().regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Use a language code like en or pt-BR.").default("en"),
  ownSources: z.array(z.url("Sources must be web links.")).max(10).optional(),
});
export type Brief = z.input<typeof BriefSchema>;

export type CreateResult =
  | { ok: true; runId: string; cost: number; balance: number }
  | { ok: false; error: string };

/** Checks the brief, charges the credits and creates the run in one atomic step. */
export async function createRun(
  db: Db,
  user: { id: string; plan: string },
  input: Brief,
  opts: { demo?: boolean } = {},
): Promise<CreateResult> {
  const parsed = BriefSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const b = parsed.data;

  const allowed = planAllows(user.plan, b.words, b.depth);
  if (!allowed.ok) return { ok: false, error: allowed.reason };
  if (b.ownSources?.length && !["pro", "studio"].includes(user.plan)) {
    return { ok: false, error: "Adding your own sources is available on the Pro plan and above." };
  }

  const active = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(runs)
    .where(and(eq(runs.userId, user.id), inArray(runs.status, ["queued", "running"])));
  if (active[0].n >= MAX_ACTIVE_RUNS) {
    return { ok: false, error: `You already have ${MAX_ACTIVE_RUNS} scripts in progress. Wait for one to finish.` };
  }

  const cost = runCost(b.words, b.depth);
  // The id is chosen up front so credits can be charged BEFORE the run row exists. Charging takes an exclusive
  // lock on the user's row; inserting the run first would take a shared lock on it (foreign key), and two
  // simultaneous requests would then deadlock waiting to upgrade. Locking first keeps them in a clean line.
  const runId = randomUUID();
  try {
    return await db.transaction(async (tx) => {
      const { balance } = await spendCredits(tx, {
        userId: user.id,
        amount: cost.total,
        runId,
        note: `${b.words.toLocaleString("en-US")}-word script${b.depth === "deep" ? " with deep research" : ""}`,
      });
      await tx.insert(runs).values({
        id: runId,
        userId: user.id,
        topic: b.topic,
        format: b.format,
        niche: b.niche || null,
        words: b.words,
        depth: b.depth,
        voiceNotes: b.voiceNotes || null,
        ownSources: b.ownSources ?? null,
        language: b.language,
        creditsCost: cost.total,
        deepRunsPlanned: cost.deepRuns,
        demo: opts.demo ?? false,
      });
      await emit(tx as unknown as Db, runId, "info", "Queued. Waiting for a free writer.");
      return { ok: true as const, runId, cost: cost.total, balance };
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return { ok: false, error: `This script needs ${err.needed.toLocaleString("en-US")} credits and you have ${err.balance.toLocaleString("en-US")}.` };
    }
    throw err;
  }
}

/**
 * Cancels a run. A queued run is cancelled and refunded in full. A running run is asked to stop at its
 * next safe point and the worker refunds it, keeping the credits for deep research that already started.
 */
export async function cancelRun(db: Db, userId: string, runId: string): Promise<{ ok: boolean; error?: string }> {
  const run = (await db.select().from(runs).where(and(eq(runs.id, runId), eq(runs.userId, userId))).limit(1))[0];
  if (!run) return { ok: false, error: "Script not found." };
  if (run.status === "queued") {
    const claimed = await db
      .update(runs)
      .set({ status: "cancelled", stage: "done", finishedAt: new Date() })
      .where(and(eq(runs.id, runId), eq(runs.status, "queued")))
      .returning({ id: runs.id });
    if (claimed.length) {
      await refundRun(db, runId, "Cancelled before it started");
      await emit(db, runId, "info", "Cancelled. Credits returned.");
      return { ok: true };
    }
  }
  const fresh = (await db.select({ status: runs.status }).from(runs).where(eq(runs.id, runId)).limit(1))[0];
  if (fresh?.status === "running") {
    await db.update(runs).set({ cancelRequestedAt: new Date() }).where(eq(runs.id, runId));
    await emit(db, runId, "info", "Stopping after the current step.");
    return { ok: true };
  }
  return { ok: false, error: "This script has already finished." };
}

/** Credits to keep when a user cancels: deep research runs we already paid TinyFish for. */
export async function creditsToKeep(db: Db, runId: string): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(providerEvents)
    .where(and(eq(providerEvents.runId, runId), inArray(providerEvents.kind, ["research_deep", "research_max"])));
  return rows[0].n * DEEP_RUN_CREDITS;
}
