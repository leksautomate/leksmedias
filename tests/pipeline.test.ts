import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, asc, eq } from "drizzle-orm";
import { facts, llmCalls, providerEvents, runEvents, runSections, runs, scripts, sources } from "@/db/schema";
import { getBalance, grantCredits, ledgerSum } from "@/lib/core/ledger";
import { lint } from "@/lib/core/lint";
import { claimNext, recoverStale, releaseRun } from "@/lib/pipeline/queue";
import { createRun, cancelRun } from "@/lib/pipeline/create";
import { MAX_ATTEMPTS, executeRun, runOnce, type Deps } from "@/lib/pipeline/run";
import { DemoLlm, DemoWeb } from "@/lib/providers/demo";
import {
  TransientProviderError,
  type DeepResearchOptions,
  type LlmProvider,
  type LlmRequest,
  type WebProvider,
} from "@/lib/providers/types";
import { closeDb, db, makeUser, resetDb } from "./helpers";

process.env.DEMO_DELAY_MS = "0";

beforeEach(async () => {
  await resetDb();
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterAll(closeDb);

/** A model that behaves like the demo one but lets a test interfere with chosen calls. */
class Hooked implements LlmProvider {
  readonly name = "hooked";
  calls: { step: string; n: number }[] = [];
  private inner = new DemoLlm();
  constructor(private hook?: (req: LlmRequest, nthOfStep: number) => string | undefined | Promise<string | undefined>) {}
  count = (step: string) => this.calls.filter((c) => c.step === step).length;
  async complete(req: LlmRequest) {
    const n = this.count(req.step) + 1;
    this.calls.push({ step: req.step, n });
    const override = await this.hook?.(req, n);
    if (override !== undefined) return { text: override, model: "demo", usage: { inputTokens: 10, outputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0 }, costUsd: 0.001, ms: 1, stopReason: "end_turn" };
    return this.inner.complete(req);
  }
}

class CountingWeb extends DemoWeb {
  deepCalls: { query: string; mode: string; resumeId?: string | null }[] = [];
  override async deepResearch(query: string, opts: DeepResearchOptions) {
    this.deepCalls.push({ query, mode: opts.mode, resumeId: opts.resumeId });
    return super.deepResearch(query, opts);
  }
}

async function setup(plan = "creator", credits = 10_000) {
  const user = await makeUser({ plan, emailVerifiedAt: new Date() });
  await grantCredits(db, { userId: user.id, amount: credits, kind: "grant" });
  return user;
}

const deps = (over: Partial<Deps> = {}): Deps => ({ db, llm: new DemoLlm(), web: new DemoWeb(), workerId: "test", log: (m, e) => console.error(m, e instanceof Error ? e.message : e), ...over });

async function brief(user: { id: string; plan: string }, over: Record<string, unknown> = {}) {
  const r = await createRun(db, user, {
    topic: "The rise and fall of a video rental chain",
    format: "documentary",
    words: 2500,
    depth: "standard",
    ...over,
  } as never);
  if (!r.ok) throw new Error(r.error);
  return r;
}

describe("creating a run", () => {
  it("charges the credits and creates the run in one step", async () => {
    const u = await setup("creator", 1000);
    const r = await brief(u, { words: 5000 });
    expect(r.cost).toBe(300);
    expect(r.balance).toBe(700);
    const run = (await db.select().from(runs))[0];
    expect(run.creditsCost).toBe(300);
    expect(run.status).toBe("queued");
    expect(await getBalance(db, u.id)).toBe(700);
    expect(await ledgerSum(db, u.id)).toBe(700);
  });

  it("prices deep research at 800 credits per run", async () => {
    const u = await setup("pro", 5000);
    const r = await brief(u, { words: 10000, depth: "deep" });
    expect(r.cost).toBe(600 + 2 * 800);
  });

  it("refuses when credits are short and creates nothing", async () => {
    const u = await setup("creator", 100);
    const r = await createRun(db, u, { topic: "A topic that is long enough", format: "listicle", words: 2500, depth: "standard" });
    expect(r).toMatchObject({ ok: false });
    expect(!r.ok && r.error).toMatch(/needs 150 credits and you have 100/);
    expect(await db.select().from(runs)).toHaveLength(0);
    expect(await getBalance(db, u.id)).toBe(100);
  });

  it("cannot overspend when many scripts are started at once", async () => {
    const u = await setup("creator", 400);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => createRun(db, u, { topic: "A topic that is long enough", format: "listicle", words: 2500, depth: "standard" })),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(2); // 2 x 150 = 300 of 400
    expect(await getBalance(db, u.id)).toBe(100);
    expect(await db.select().from(runs)).toHaveLength(2);
    expect(await ledgerSum(db, u.id)).toBe(100);
  });

  it("enforces what each plan allows", async () => {
    const starter = await setup("starter", 5000);
    const tooLong = await createRun(db, starter, { topic: "A topic that is long enough", format: "documentary", words: 5000, depth: "standard" });
    expect(!tooLong.ok && tooLong.error).toMatch(/up to 2,500 words/);
    const noDeep = await createRun(db, starter, { topic: "A topic that is long enough", format: "documentary", words: 1500, depth: "deep" });
    expect(!noDeep.ok && noDeep.error).toMatch(/Creator plan/);
    const ownSrc = await createRun(db, starter, { topic: "A topic that is long enough", format: "documentary", words: 1500, depth: "standard", ownSources: ["https://example.com/a"] });
    expect(!ownSrc.ok && ownSrc.error).toMatch(/Pro plan/);
    expect(await db.select().from(runs)).toHaveLength(0);
  });

  it("validates the brief", async () => {
    const u = await setup();
    for (const bad of [{ topic: "short" }, { words: 100 }, { words: 99999 }, { format: "poem" }, { depth: "extreme" }]) {
      const r = await createRun(db, u, { topic: "A topic that is long enough", format: "listicle", words: 2500, depth: "standard", ...bad } as never);
      expect(r.ok).toBe(false);
    }
    expect(await getBalance(db, u.id)).toBe(10_000);
  });

  it("limits scripts in progress per person", async () => {
    const u = await setup("creator", 5000);
    for (let i = 0; i < 3; i++) await brief(u, { words: 1000 });
    const fourth = await createRun(db, u, { topic: "A topic that is long enough", format: "listicle", words: 1000, depth: "standard" });
    expect(!fourth.ok && fourth.error).toMatch(/3 scripts in progress/);
  });
});

describe("a full run with the demo providers", () => {
  it("writes a 2,500-word script and builds all three deliverables", async () => {
    const u = await setup();
    const { runId } = await brief(u);
    expect(await runOnce(deps(), runId)).toBe("completed");

    const run = (await db.select().from(runs).where(eq(runs.id, runId)))[0];
    expect(run.status).toBe("completed");
    expect(run.stage).toBe("done");
    const s = await db.select().from(scripts).where(eq(scripts.runId, runId)).orderBy(asc(scripts.kind));
    expect(s.map((x) => x.kind)).toEqual(["clean", "sources", "visual"]);
    const [clean, sourcesDoc, visual] = s;

    // the clean version is safe for text-to-speech
    expect(clean.body).not.toMatch(/[\[\]{}]/);
    expect(clean.body).not.toMatch(/https?:/);
    expect(lint({ narration: clean.body.split("\n\n"), fullText: clean.body, mode: "clean" }).filter((i) => i.severity === "error")).toEqual([]);
    expect(clean.wordCount).toBeGreaterThan(2000);

    // the editor version has headings with timestamps and cue lines, and no fact tags
    expect(visual.body).toMatch(/^HOOK \(0:00-/);
    expect(visual.body).toMatch(/\[B-ROLL: /);
    expect(visual.body).not.toMatch(/\{f\d/);

    expect(sourcesDoc.body).toContain("SOURCES AND FACT CHECK");
    expect(sourcesDoc.body).toMatch(/\[1\] /);
    expect((clean.audit as { factsUsed: number }).factsUsed).toBeGreaterThan(0);
  });

  it("stores sources and facts, and every fact points at a real source", async () => {
    const u = await setup();
    const { runId } = await brief(u);
    await runOnce(deps(), runId);
    const src = await db.select().from(sources).where(eq(sources.runId, runId));
    const f = await db.select().from(facts).where(eq(facts.runId, runId));
    expect(src.length).toBeGreaterThanOrEqual(3);
    expect(f.length).toBeGreaterThanOrEqual(9);
    const valid = new Set(src.map((x) => x.n));
    for (const fact of f) {
      expect(fact.sourceNs.length).toBeGreaterThan(0);
      for (const n of fact.sourceNs) expect(valid.has(n)).toBe(true);
    }
    expect(f.some((x) => x.allegation)).toBe(true);
  });

  it("logs every model call with tokens and cost, and shows progress events", async () => {
    const u = await setup();
    const { runId } = await brief(u);
    const llm = new Hooked((req) => (req.step === "section" ? undefined : undefined));
    await runOnce(deps({ llm }), runId);
    const calls = await db.select().from(llmCalls).where(eq(llmCalls.runId, runId));
    expect(calls.map((c) => c.step)).toEqual(expect.arrayContaining(["queries", "facts", "outline", "section"]));
    expect(calls.every((c) => c.model.startsWith("demo"))).toBe(true);
    const events = await db.select().from(runEvents).where(eq(runEvents.runId, runId)).orderBy(asc(runEvents.id));
    const kinds = events.map((e) => e.kind);
    expect(kinds).toEqual(expect.arrayContaining(["stage", "search", "read", "info"]));
    expect(events.at(-1)!.message).toMatch(/^Done\./);
  });

  it("writes a 10,000-word script in four sections", async () => {
    const u = await setup("pro", 10_000);
    const { runId } = await brief(u, { words: 10000, format: "true_crime" });
    expect(await runOnce(deps(), runId)).toBe("completed");
    const secs = await db.select().from(runSections).where(eq(runSections.runId, runId)).orderBy(asc(runSections.idx));
    expect(secs).toHaveLength(4);
    expect(secs.every((s) => s.status === "done")).toBe(true);
    const clean = (await db.select().from(scripts).where(and(eq(scripts.runId, runId), eq(scripts.kind, "clean"))))[0];
    expect(clean.wordCount).toBeGreaterThan(9000);
    const visual = (await db.select().from(scripts).where(and(eq(scripts.runId, runId), eq(scripts.kind, "visual"))))[0];
    expect(visual.body.match(/\(\d+:\d\d(?::\d\d)?-/g)!.length).toBeGreaterThan(4);
    expect((await db.select().from(runs).where(eq(runs.id, runId)))[0].progress).toEqual({ done: 4, total: 4 });
  });

  it("writes a 30,000-word deep-research script across 12 sections and 5 research runs", async () => {
    const u = await setup("studio", 20_000);
    const web = new CountingWeb();
    const { runId, cost } = await brief(u, { words: 30000, depth: "deep" });
    expect(cost).toBe(1800 + 5 * 800);
    expect(await runOnce(deps({ web }), runId)).toBe("completed");
    expect(web.deepCalls).toHaveLength(5);
    expect(web.deepCalls[0].mode).toBe("max");
    expect(web.deepCalls.slice(1).every((c) => c.mode === "deep")).toBe(true);
    const secs = await db.select().from(runSections).where(eq(runSections.runId, runId));
    expect(secs).toHaveLength(12);
    const pe = await db.select().from(providerEvents).where(eq(providerEvents.runId, runId));
    expect(pe.filter((p) => p.kind.startsWith("research"))).toHaveLength(5);
    const clean = (await db.select().from(scripts).where(and(eq(scripts.runId, runId), eq(scripts.kind, "clean"))))[0];
    expect(clean.wordCount).toBeGreaterThan(27_000);
  });
});

describe("recovering from trouble", () => {
  it("resumes after a crash without redoing finished sections", async () => {
    const u = await setup("pro", 5000);
    const { runId } = await brief(u, { words: 7500 }); // 3 sections
    let crashed = false;
    const llm = new Hooked((req, n) => {
      if (req.step === "section" && n === 3 && !crashed) {
        crashed = true;
        throw new TransientProviderError("simulated outage", 503);
      }
      return undefined;
    });
    await expect(executeRun(deps({ llm }), runId)).rejects.toThrow("simulated outage");
    const saved = await db.select().from(runSections).where(eq(runSections.runId, runId)).orderBy(asc(runSections.idx));
    expect(saved.map((s) => s.status)).toEqual(["done", "done", "pending"]);

    await executeRun(deps({ llm }), runId);
    // 3 sections were needed in total; the two finished ones were not written again
    expect(llm.count("section")).toBe(4); // 2 before the crash + the failed third + the retried third
    expect(llm.count("facts")).toBe(1);
    expect(llm.count("outline")).toBe(1);
    expect((await db.select().from(runs).where(eq(runs.id, runId)))[0].status).toBe("completed");
  });

  it("does not pay for deep research twice after a restart", async () => {
    const u = await setup("creator", 5000);
    const { runId } = await brief(u, { words: 1500, depth: "deep" });
    const web = new CountingWeb();
    const llm = new Hooked((req) => {
      if (req.step === "facts") throw new TransientProviderError("down", 503);
      return undefined;
    });
    await expect(executeRun(deps({ llm, web }), runId)).rejects.toThrow();
    expect(web.deepCalls).toHaveLength(1);
    await executeRun(deps({ web }), runId);
    expect(web.deepCalls).toHaveLength(1); // the saved report was reused
    expect((await db.select().from(runs).where(eq(runs.id, runId)))[0].status).toBe("completed");
  });

  it("retries a temporary failure later, then gives up and refunds", async () => {
    const u = await setup("creator", 1000);
    const { runId } = await brief(u);
    const broken = new Hooked((req) => {
      if (req.step === "outline") throw new TransientProviderError("overloaded", 529);
      return undefined;
    });

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const id = await claimNext(db, "w1");
      expect(id).toBe(runId);
      const outcome = await runOnce(deps({ llm: broken }), runId);
      expect(outcome).toBe(attempt < MAX_ATTEMPTS ? "retry" : "failed");
      if (attempt < MAX_ATTEMPTS) {
        const r = (await db.select().from(runs).where(eq(runs.id, runId)))[0];
        expect(r.status).toBe("queued");
        expect(r.availableAt.getTime()).toBeGreaterThan(Date.now()); // backoff
        expect(await claimNext(db, "w1")).toBeNull(); // not ready yet
        await db.update(runs).set({ availableAt: new Date() }).where(eq(runs.id, runId));
      }
    }
    const final = (await db.select().from(runs).where(eq(runs.id, runId)))[0];
    expect(final.status).toBe("failed");
    expect(final.error).toMatch(/provider/);
    expect(await getBalance(db, u.id)).toBe(1000); // everything returned
    expect(await ledgerSum(db, u.id)).toBe(1000);
  });

  it("stops at once and refunds when research is too thin to trust", async () => {
    const u = await setup("creator", 1000);
    const { runId } = await brief(u);
    const thin = new Hooked((req) => (req.step === "facts" ? JSON.stringify({ facts: [{ claim: "Only one usable fact here.", sources: [1], confidence: "high", allegation: false }] }) : undefined));
    expect(await runOnce(deps({ llm: thin }), runId)).toBe("failed");
    const r = (await db.select().from(runs).where(eq(runs.id, runId)))[0];
    expect(r.error).toMatch(/only 1 usable facts/);
    expect(await getBalance(db, u.id)).toBe(1000);
    expect(thin.count("outline")).toBe(0); // never got as far as writing
  });

  it("ignores facts that cite sources that do not exist", async () => {
    const u = await setup("creator", 1000);
    const { runId } = await brief(u);
    const bad = new Hooked((req) => {
      if (req.step !== "facts") return undefined;
      const good = Array.from({ length: 12 }, (_, i) => ({ claim: `A properly sourced fact number ${i + 1}.`, sources: [1], confidence: "high", allegation: false }));
      const ghosts = Array.from({ length: 6 }, (_, i) => ({ claim: `A made-up fact number ${i + 1}.`, sources: [999], confidence: "high", allegation: false }));
      return JSON.stringify({ facts: [...ghosts, ...good] });
    });
    expect(await runOnce(deps({ llm: bad }), runId)).toBe("completed");
    const f = await db.select().from(facts).where(eq(facts.runId, runId));
    expect(f).toHaveLength(12);
    expect(f.every((x) => x.claim.startsWith("A properly sourced"))).toBe(true);
  });

  it("re-asks once when the model answers with something that is not JSON", async () => {
    const u = await setup("creator", 1000);
    const { runId } = await brief(u);
    const llm = new Hooked((req, n) => (req.step === "outline" && n === 1 ? "Sure! Here is a plan: first the hook..." : undefined));
    expect(await runOnce(deps({ llm }), runId)).toBe("completed");
    expect(llm.count("outline")).toBe(2);
  });

  it("rewrites a section that uses banned patterns, and ships the rewrite", async () => {
    const u = await setup("creator", 1000);
    const { runId } = await brief(u, { words: 1000 });
    const llm = new Hooked((req, n) => {
      if (req.step === "section" && n === 1) {
        const body = Array.from({ length: 40 }, (_, i) => `Here is a filler sentence number ${i + 1} that keeps the section long enough to count. {f1}`).join(" ");
        return `## Hook\n${body} Here's the thing: it was a game-changing move — and nobody saw it, but why? {f1}`;
      }
      return undefined;
    });
    expect(await runOnce(deps({ llm }), runId)).toBe("completed");
    expect(llm.count("section")).toBe(2);
    const sec = (await db.select().from(runSections).where(eq(runSections.runId, runId)))[0];
    expect(sec.attempts).toBe(2);
    expect(sec.raw).not.toMatch(/Here's the thing|game-changing|—/);
  });

  it("removes dashes automatically even when the rewrite does not", async () => {
    const u = await setup("creator", 1000);
    const { runId } = await brief(u, { words: 600 });
    const stubborn = new Hooked((req) => (req.step === "section" ? "## Hook\nHe left early — and never came back, but why did he go? {f1}\nIt was a quiet night. {f2}" : undefined));
    expect(await runOnce(deps({ llm: stubborn }), runId)).toBe("completed");
    const all = await db.select().from(scripts).where(eq(scripts.runId, runId));
    for (const s of all) expect(s.body).not.toMatch(/—/);
  });
});

describe("cancelling", () => {
  it("refunds in full when the run has not started", async () => {
    const u = await setup("creator", 1000);
    const { runId } = await brief(u);
    expect(await getBalance(db, u.id)).toBe(850);
    expect(await cancelRun(db, u.id, runId)).toEqual({ ok: true });
    expect((await db.select().from(runs).where(eq(runs.id, runId)))[0].status).toBe("cancelled");
    expect(await getBalance(db, u.id)).toBe(1000);
  });

  it("will not cancel someone else's script", async () => {
    const a = await setup();
    const b = await setup();
    const { runId } = await brief(a);
    expect((await cancelRun(db, b.id, runId)).ok).toBe(false);
    expect((await db.select().from(runs).where(eq(runs.id, runId)))[0].status).toBe("queued");
  });

  it("stops a running script at the next safe point and refunds", async () => {
    const u = await setup("pro", 5000);
    const { runId } = await brief(u, { words: 7500 });
    await claimNext(db, "w1");
    const llm = new Hooked(async (req, n) => {
      if (req.step === "section" && n === 1) await cancelRun(db, u.id, runId); // user presses Cancel while writing
      return undefined;
    });
    expect(await runOnce(deps({ llm }), runId)).toBe("cancelled");
    expect(llm.count("section")).toBe(1); // did not carry on to the next section
    expect(await getBalance(db, u.id)).toBe(5000);
  });

  it("keeps the credits for deep research that was already paid for", async () => {
    const u = await setup("creator", 5000);
    const { runId } = await brief(u, { words: 1500, depth: "deep" }); // 100 + 800
    await claimNext(db, "w1");
    const llm = new Hooked(async (req) => {
      if (req.step === "facts") await cancelRun(db, u.id, runId);
      return undefined;
    });
    expect(await runOnce(deps({ llm }), runId)).toBe("cancelled");
    expect(await getBalance(db, u.id)).toBe(5000 - 800); // script credits back, the deep run is not refundable
  });

  it("refuses to cancel a finished script", async () => {
    const u = await setup();
    const { runId } = await brief(u);
    await runOnce(deps(), runId);
    expect(await cancelRun(db, u.id, runId)).toMatchObject({ ok: false });
  });
});

describe("queue", () => {
  async function queued(userId: string, depth: "standard" | "deep" = "standard", ageMs = 0) {
    const [r] = await db
      .insert(runs)
      .values({ userId, topic: "x".repeat(12), format: "listicle", words: 1000, depth, creditsCost: 100, createdAt: new Date(Date.now() - ageMs) })
      .returning({ id: runs.id });
    return r.id;
  }

  it("takes the oldest run first", async () => {
    const u = await makeUser();
    const newer = await queued(u.id, "standard", 1000);
    const older = await queued(u.id, "standard", 60_000);
    expect(await claimNext(db, "w1")).toBe(older);
    expect(await claimNext(db, "w1")).toBe(newer);
    expect(await claimNext(db, "w1")).toBeNull();
  });

  it("never hands one run to two workers", async () => {
    const u = await makeUser();
    await queued(u.id);
    const got = await Promise.all(Array.from({ length: 8 }, (_, i) => claimNext(db, `w${i}`)));
    expect(got.filter(Boolean)).toHaveLength(1);
    const r = (await db.select().from(runs))[0];
    expect(r.status).toBe("running");
    expect(r.attempts).toBe(1);
  });

  it("splits many runs between workers without overlap", async () => {
    const u = await makeUser();
    for (let i = 0; i < 6; i++) await queued(u.id, "standard", i * 1000);
    const got = (await Promise.all(Array.from({ length: 10 }, (_, i) => claimNext(db, `w${i}`)))).filter(Boolean);
    expect(got).toHaveLength(6);
    expect(new Set(got).size).toBe(6);
  });

  it("holds back deep scripts once the deep limit is reached, but still serves standard ones", async () => {
    const u = await makeUser();
    const d1 = await queued(u.id, "deep", 5000);
    const d2 = await queued(u.id, "deep", 4000);
    const d3 = await queued(u.id, "deep", 3000);
    const s1 = await queued(u.id, "standard", 1000);
    expect(await claimNext(db, "w", 2)).toBe(d1);
    expect(await claimNext(db, "w", 2)).toBe(d2);
    expect(await claimNext(db, "w", 2)).toBe(s1); // d3 waits
    expect(await claimNext(db, "w", 2)).toBeNull();
    await db.update(runs).set({ status: "completed" }).where(eq(runs.id, d1));
    expect(await claimNext(db, "w", 2)).toBe(d3);
  });

  it("recovers a run whose worker stopped sending heartbeats", async () => {
    const u = await makeUser();
    const id = await queued(u.id);
    await claimNext(db, "w1");
    expect(await recoverStale(db)).toBe(0); // fresh heartbeat
    await db.update(runs).set({ heartbeatAt: new Date(Date.now() - 5 * 60_000) }).where(eq(runs.id, id));
    expect(await recoverStale(db)).toBe(1);
    expect((await db.select().from(runs))[0].status).toBe("queued");
    expect(await claimNext(db, "w2")).toBe(id);
  });

  it("hands a run back during shutdown without counting an attempt", async () => {
    const u = await makeUser();
    const id = await queued(u.id);
    await claimNext(db, "w1");
    await releaseRun(db, id, "someone-else"); // not the owner: ignored
    expect((await db.select().from(runs))[0].status).toBe("running");
    await releaseRun(db, id, "w1");
    const r = (await db.select().from(runs))[0];
    expect(r.status).toBe("queued");
    expect(r.attempts).toBe(0);
  });
});

describe("web providers that fail", () => {
  it("fails with a clear message and a refund when no sources can be found", async () => {
    const u = await setup("creator", 1000);
    const { runId } = await brief(u);
    const empty: WebProvider = {
      name: "empty",
      search: async () => [],
      fetchPages: async () => ({ pages: [], failed: [] }),
      deepResearch: async () => {
        throw new Error("unused");
      },
    };
    expect(await runOnce(deps({ web: empty }), runId)).toBe("failed");
    expect((await db.select().from(runs))[0].error).toMatch(/could not find enough sources/);
    expect(await getBalance(db, u.id)).toBe(1000);
  });
});
