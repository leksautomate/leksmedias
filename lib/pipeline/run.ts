import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import {
  facts as factsTable,
  llmCalls,
  providerEvents,
  runSections,
  runs,
  scripts,
  sources as sourcesTable,
  type Outline,
} from "@/db/schema";
import { deepRunsFor, formatDuration, sectionCount } from "@/lib/core/credits";
import { refundRun } from "@/lib/core/ledger";
import { autofix, lint, splitSentences, wordCount, type LintIssue } from "@/lib/core/lint";
import { FACT_SYSTEM, OUTLINE_SYSTEM, formatById, sectionPrompt, writerSystem } from "@/lib/core/rules";
import {
  assembleClean,
  assembleVisual,
  buildSourcesReport,
  narrationParagraphs,
  narrationWords,
  parseRaw,
  type Item,
} from "@/lib/core/script";
import { PermanentProviderError, type LlmProvider, type LlmRequest, type WebProvider } from "@/lib/providers/types";
import { creditsToKeep } from "./create";
import { emit } from "./events";

export const MAX_ATTEMPTS = 3;

export class RunCancelled extends Error {
  constructor() {
    super("cancelled");
  }
}
/** A failure retrying cannot fix. The message is safe to show to the user. */
export class PermanentRunError extends Error {}

export type Deps = {
  db: Db;
  llm: LlmProvider;
  web: WebProvider;
  workerId: string;
  log?: (message: string, err?: unknown) => void;
};

type Run = typeof runs.$inferSelect;
type Ctx = Deps & { run: Run };

/* ------------------------------------------------------------------ helpers */

const QUERIES_SYSTEM = `You plan web research for a video script. Output ONLY a JSON object: {"queries":["..."]}.
Each query is a specific search a person would type. Cover different angles: the main story, key people, dates and timeline, numbers, controversy or criticism, and what happened after. No duplicates, no quotes or operators.`;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    for (const k of [...u.searchParams.keys()]) if (k.startsWith("utm_") || k === "fbclid") u.searchParams.delete(k);
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

const LOW_VALUE_HOSTS = ["pinterest.", "facebook.com", "instagram.com", "tiktok.com", "quora.com", "reddit.com", "twitter.com", "x.com"];
const isLowValue = (url: string) => LOW_VALUE_HOSTS.some((h) => hostOf(url).includes(h));

function extractJson(text: string): unknown {
  const t = text.replace(/```(?:json)?/gi, "").trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in the answer");
  return JSON.parse(t.slice(start, end + 1));
}

async function checkCancel(ctx: Ctx) {
  const r = await ctx.db.select({ c: runs.cancelRequestedAt }).from(runs).where(eq(runs.id, ctx.run.id)).limit(1);
  if (r[0]?.c) throw new RunCancelled();
}

async function setStage(ctx: Ctx, stage: string, message: string) {
  await ctx.db.update(runs).set({ stage }).where(eq(runs.id, ctx.run.id));
  await emit(ctx.db, ctx.run.id, "stage", message);
}

async function addCost(ctx: Ctx, usd: number) {
  if (!usd) return;
  await ctx.db.update(runs).set({ costUsd: sql`${runs.costUsd} + ${usd}` }).where(eq(runs.id, ctx.run.id));
}

/** Calls the model and records tokens and dollars for the run. */
async function callLlm(ctx: Ctx, req: LlmRequest) {
  const res = await ctx.llm.complete(req);
  await ctx.db.insert(llmCalls).values({
    runId: ctx.run.id,
    step: req.step,
    provider: ctx.llm.name,
    model: res.model,
    inputTokens: res.usage.inputTokens,
    outputTokens: res.usage.outputTokens,
    cacheReadTokens: res.usage.cacheReadTokens,
    cacheWriteTokens: res.usage.cacheWriteTokens,
    costUsd: String(res.costUsd),
    ms: res.ms,
  });
  await addCost(ctx, res.costUsd);
  return res;
}

/** Asks for JSON and re-asks once if the answer cannot be parsed. */
async function callJson<T>(ctx: Ctx, req: LlmRequest, schema: z.ZodType<T>): Promise<T> {
  let user = req.user;
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await callLlm(ctx, { ...req, user });
    try {
      return schema.parse(extractJson(res.text));
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      user = `${req.user}\n\nYour last answer could not be read (${lastError.slice(0, 150)}). Return ONLY the JSON object, nothing else.`;
    }
  }
  throw new Error(`The model did not return usable JSON for step "${req.step}": ${lastError}`);
}

/* ------------------------------------------------------------------ research */

const QueriesSchema = z.object({ queries: z.array(z.string().min(3).max(300)).min(1) });

async function researchStage(ctx: Ctx) {
  const { db, run, web } = ctx;
  const have = await db.select({ n: sql<number>`count(*)::int` }).from(sourcesTable).where(eq(sourcesTable.runId, run.id));
  if (run.researchReport && have[0].n > 0) return;

  await setStage(ctx, "research", run.depth === "deep" ? "Starting deep research" : "Researching the web");
  await checkCancel(ctx);

  if (run.depth === "standard") {
    const pagesTarget = run.words <= 3000 ? 12 : run.words <= 12000 ? 25 : 50;
    const nQueries = Math.min(6, 4 + (sectionCount(run.words) > 1 ? 2 : 0));
    let queries: string[] = [run.topic];
    try {
      const q = await callJson(
        ctx,
        {
          step: "queries",
          model: "fast",
          system: QUERIES_SYSTEM,
          user: `TOPIC: ${run.topic}\nFORMAT: ${run.format}\nReturn exactly ${nQueries} queries.`,
          maxTokens: 800,
        },
        QueriesSchema,
      );
      queries = q.queries.slice(0, nQueries);
    } catch {
      queries = [run.topic, `${run.topic} timeline`, `${run.topic} what happened`, `${run.topic} controversy`];
    }

    const perQuery: string[][] = [];
    for (const q of queries) {
      await checkCancel(ctx);
      await emit(db, run.id, "search", `Searching: ${q}`);
      try {
        const hits = await web.search(q, { purpose: `Researching facts for a video script about: ${run.topic}`, language: run.language });
        perQuery.push(hits.map((h) => h.url));
      } catch (err) {
        if (err instanceof PermanentProviderError) throw err;
        await emit(db, run.id, "warn", `A search failed and was skipped: ${q}`);
        ctx.log?.(`search failed: ${q}`, err);
      }
    }

    // Own sources first, then one result from each query in turn so no single query dominates.
    const wanted: string[] = [...(run.ownSources ?? [])];
    const seen = new Set(wanted.map(normalizeUrl));
    for (let i = 0; wanted.length < Math.ceil(pagesTarget * 1.4); i++) {
      let any = false;
      for (const list of perQuery) {
        const u = list[i];
        if (!u) continue;
        any = true;
        const key = normalizeUrl(u);
        if (seen.has(key) || isLowValue(u)) continue;
        seen.add(key);
        wanted.push(u);
        if (wanted.length >= Math.ceil(pagesTarget * 1.4)) break;
      }
      if (!any) break;
    }
    if (wanted.length === 0) throw new PermanentRunError("We could not find enough sources for this topic. Try rewording it or making it more specific. Your credits were returned.");

    await emit(db, run.id, "read", `Reading ${wanted.length} pages`);
    await checkCancel(ctx);
    const { pages, failed } = await web.fetchPages(wanted);
    await db.insert(providerEvents).values({ runId: run.id, provider: web.name, kind: "fetch", status: "completed", meta: { requested: wanted.length, ok: pages.length, failed: failed.length } });
    if (failed.length) await emit(db, run.id, "warn", `${failed.length} pages could not be read and were skipped`);

    const usable = pages.filter((p) => p.text.trim().length > 200).slice(0, pagesTarget);
    if (usable.length < 3) {
      throw new PermanentRunError("We found too few readable sources on this topic to write a reliable script. Your credits were returned.");
    }
    await db.insert(sourcesTable).values(
      usable.map((p, i) => ({
        runId: run.id,
        n: i + 1,
        url: p.url,
        title: p.title ?? hostOf(p.url),
        host: hostOf(p.url),
        excerpt: excerpt(p.text, 3500),
      })),
    );
    for (const p of usable.slice(0, 12)) await emit(db, run.id, "read", `Read ${hostOf(p.url)}`);
    await db.update(runs).set({ researchReport: `Standard research: ${usable.length} pages read from ${queries.length} searches.` }).where(eq(runs.id, run.id));
    return;
  }

  /* deep research: one TinyFish run per angle, up to 3 at a time. Runs we already started are resumed, not repeated. */
  const runsN = deepRunsFor(run.words);
  let angles: string[] = [run.topic];
  if (runsN > 1) {
    try {
      const q = await callJson(
        ctx,
        {
          step: "queries",
          model: "fast",
          system: QUERIES_SYSTEM,
          user: `TOPIC: ${run.topic}\nFORMAT: ${run.format}\nThe first query is the broad overview of the whole story. The others each dig into one distinct part of it.\nReturn exactly ${runsN} queries.`,
          maxTokens: 1200,
        },
        QueriesSchema,
      );
      angles = q.queries.slice(0, runsN);
    } catch {
      angles = [run.topic];
    }
    while (angles.length < runsN) angles.push(`${run.topic} part ${angles.length + 1}`);
  }

  type Done = { report: string; citations: string[] };
  const prior = await db.select().from(providerEvents).where(and(eq(providerEvents.runId, run.id), sql`${providerEvents.kind} in ('research_deep','research_max')`));
  const results: Done[] = new Array(angles.length);

  const doAngle = async (i: number) => {
    const mode = i === 0 && angles.length > 1 ? "max" : "deep";
    const existing = prior.find((p) => (p.meta as { angle?: number } | null)?.angle === i);
    const meta = existing?.meta as { report?: string; citations?: string[] } | null;
    if (existing?.status === "completed" && meta?.report) {
      results[i] = { report: meta.report, citations: meta.citations ?? [] };
      return;
    }
    await emit(db, run.id, "search", `Deep research ${i + 1} of ${angles.length}: ${angles[i].slice(0, 80)}`);
    let eventId = existing?.id;
    const r = await web.deepResearch(angles[i], {
      mode,
      language: run.language,
      resumeId: existing?.externalId ?? null,
      onStarted: async (externalId) => {
        const [row] = await db
          .insert(providerEvents)
          .values({ runId: run.id, provider: web.name, kind: mode === "max" ? "research_max" : "research_deep", externalId, status: "started", meta: { angle: i, query: angles[i] } })
          .returning({ id: providerEvents.id });
        eventId = row.id;
      },
      onProgress: (m) => emit(db, run.id, "info", m),
    });
    if (eventId) {
      await db
        .update(providerEvents)
        .set({ status: "completed", costUsd: String(r.costUsd), meta: { angle: i, query: angles[i], report: r.report, citations: r.citations } })
        .where(eq(providerEvents.id, eventId));
    }
    await addCost(ctx, r.costUsd);
    results[i] = { report: r.report, citations: r.citations };
    await emit(db, run.id, "read", `Deep research ${i + 1} finished with ${r.citations.length} sources`);
  };

  const queue = angles.map((_, i) => i);
  const worker = async () => {
    for (let i = queue.shift(); i !== undefined; i = queue.shift()) {
      await checkCancel(ctx);
      await doAngle(i);
    }
  };
  await Promise.all([worker(), worker(), worker()].slice(0, Math.min(3, angles.length)));

  const seen = new Set<string>();
  const urls: string[] = [];
  for (const r of results) for (const u of [...(run.ownSources ?? []), ...r.citations]) {
    const k = normalizeUrl(u);
    if (!seen.has(k)) {
      seen.add(k);
      urls.push(u);
    }
  }
  if (urls.length < 3) throw new PermanentRunError("Deep research returned too few sources for this topic. Your credits were returned.");
  await db.insert(sourcesTable).values(urls.map((u, i) => ({ runId: run.id, n: i + 1, url: u, title: hostOf(u), host: hostOf(u), excerpt: null })));
  const combined = results.map((r, i) => `## Research angle ${i + 1}: ${angles[i]}\n\n${r.report}`).join("\n\n");
  await db.update(runs).set({ researchReport: combined }).where(eq(runs.id, run.id));
}

function excerpt(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  return (end > max * 0.6 ? cut.slice(0, end + 1) : cut).trim();
}

/* --------------------------------------------------------------------- facts */

const FactsSchema = z.object({
  facts: z.array(
    z.object({
      claim: z.string().min(10).max(500),
      sources: z.array(z.number().int()).default([]),
      confidence: z.enum(["high", "medium", "low"]).catch("medium"),
      allegation: z.boolean().catch(false),
    }),
  ),
});

export const minFactsFor = (words: number) => Math.max(6, Math.ceil(words / 300));
const maxFactsFor = (words: number) => Math.min(400, Math.ceil(words / 50));

async function factsStage(ctx: Ctx) {
  const { db, run } = ctx;
  const have = await db.select({ n: sql<number>`count(*)::int` }).from(factsTable).where(eq(factsTable.runId, run.id));
  if (have[0].n > 0) return;
  await setStage(ctx, "facts", "Checking facts against the sources");
  await checkCancel(ctx);

  const srcs = await db.select().from(sourcesTable).where(eq(sourcesTable.runId, run.id)).orderBy(asc(sourcesTable.n));
  const sourceList = srcs.map((s) => `[S${s.n}] ${s.title ?? s.host} (${s.url})`).join("\n");
  const notes =
    run.depth === "deep"
      ? `RESEARCH REPORT\n${(run.researchReport ?? "").slice(0, 250_000)}\n\nSOURCES\n${sourceList}`
      : srcs.map((s) => `[S${s.n}] ${s.title ?? s.host} (${s.url})\n${s.excerpt ?? ""}`).join("\n\n");

  const max = maxFactsFor(run.words);
  const parsed = await callJson(
    ctx,
    {
      step: "facts",
      model: "fast",
      system: FACT_SYSTEM,
      user: `TOPIC: ${run.topic}\n\nRETURN up to ${max} facts for a script of about ${run.words} words. Use source numbers from the list.\nReturn up to ${max} facts.\n\n${notes}`,
      maxTokens: 16_000,
    },
    FactsSchema,
  );

  const valid = new Set(srcs.map((s) => s.n));
  const clean = parsed.facts
    .map((f) => ({ ...f, sources: [...new Set(f.sources.filter((n) => valid.has(n)))] }))
    // A fact with no real source behind it is not a fact we can use.
    .filter((f) => f.sources.length > 0)
    .slice(0, max);

  if (clean.length < minFactsFor(run.words)) {
    throw new PermanentRunError(
      `The research turned up only ${clean.length} usable facts, not enough for a ${run.words.toLocaleString("en-US")}-word script. Try a shorter length, a more specific topic${run.depth === "standard" ? ", or deep research" : ""}. Your credits were returned.`,
    );
  }
  await db.insert(factsTable).values(
    clean.map((f, i) => ({ runId: run.id, n: i + 1, claim: f.claim, sourceNs: f.sources, confidence: f.confidence, allegation: f.allegation })),
  );
  await emit(db, run.id, "info", `${clean.length} facts ready, each tied to a source`);
}

/* ------------------------------------------------------------------- outline */

const OutlineSchema = z.object({
  title: z.string().min(3).max(200),
  sections: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        beat: z.string().max(400).default(""),
        targetWords: z.number().positive(),
        factNs: z.array(z.number().int()).default([]),
      }),
    )
    .min(1),
});

async function outlineStage(ctx: Ctx) {
  const { db, run } = ctx;
  if (run.outline) return;
  await setStage(ctx, "outline", "Planning the structure");
  await checkCancel(ctx);

  const f = await db.select().from(factsTable).where(eq(factsTable.runId, run.id)).orderBy(asc(factsTable.n));
  const n = sectionCount(run.words);
  const factLines = f.map((x) => `[f${x.n}] ${x.claim}${x.allegation ? " [allegation]" : ""}`).join("\n");
  const raw = await callJson(
    ctx,
    {
      step: "outline",
      model: "writer",
      system: OUTLINE_SYSTEM,
      user: `TOPIC: ${run.topic}\nFORMAT: ${formatById(run.format).label}\n${run.niche ? `NICHE: ${run.niche}\n` : ""}Use exactly ${n} sections with a total of ${run.words} words.\nFACT COUNT: ${f.length}\n\nFACTS:\n${factLines}`,
      maxTokens: 4000,
    },
    OutlineSchema,
  );

  // Make the model's plan safe to build on: right number of sections, right total, valid fact numbers.
  let sections = raw.sections.slice(0, n);
  while (sections.length < n) {
    sections.push({ title: `Part ${sections.length + 1}`, beat: "Continue the story and raise the stakes", targetWords: raw.sections.at(-1)?.targetWords ?? 500, factNs: [] });
  }
  const total = sections.reduce((a, s) => a + s.targetWords, 0) || 1;
  sections = sections.map((s) => ({ ...s, targetWords: Math.max(150, Math.round((s.targetWords * run.words) / total)) }));

  const valid = new Set(f.map((x) => x.n));
  const assigned = new Set<number>();
  const cleaned = sections.map((s) => ({
    ...s,
    factNs: [...new Set(s.factNs.filter((x) => valid.has(x)))],
  }));
  cleaned.forEach((s) => s.factNs.forEach((x) => assigned.add(x)));
  // Every fact belongs somewhere. Spread the unassigned ones over the lightest sections.
  for (const x of f.map((y) => y.n).filter((y) => !assigned.has(y))) {
    const lightest = cleaned.reduce((a, b) => (b.factNs.length < a.factNs.length ? b : a));
    lightest.factNs.push(x);
  }
  cleaned.forEach((s) => s.factNs.sort((a, b) => a - b));

  const outline: Outline = { title: raw.title, sections: cleaned.map((s) => ({ title: s.title, beat: s.beat, targetWords: s.targetWords, factNs: s.factNs })) };
  await db.transaction(async (tx) => {
    await tx.update(runs).set({ outline, progress: { done: 0, total: n } }).where(eq(runs.id, run.id));
    await tx.insert(runSections).values(outline.sections.map((s, idx) => ({ runId: run.id, idx, title: s.title, beat: s.beat, targetWords: s.targetWords }))).onConflictDoNothing();
  });
  await emit(db, run.id, "info", `Outline ready: ${n} section${n === 1 ? "" : "s"}`);
}

/* ------------------------------------------------------------------- writing */

/** Problems worth a second attempt. Hook rules only apply to the opening section. */
function retryReasons(issues: LintIssue[], isFirst: boolean, words: number, target: number): string[] {
  const reasons: string[] = [];
  for (const i of issues) {
    if (!isFirst && (i.rule === "hook_length" || i.rule === "hook_turn")) continue;
    if (i.rule === "colons" || i.rule === "choppy") continue; // reported, not worth a rewrite
    reasons.push(`${i.message}${i.snippet ? ` ("${i.snippet}")` : ""}`);
  }
  if (words < target * 0.6) reasons.push(`Too short: ${words} words, aim for about ${target}. Use more of the facts and develop each beat.`);
  return reasons;
}

async function writeStage(ctx: Ctx) {
  const { db, run } = ctx;
  const outline = run.outline;
  if (!outline) throw new Error("outline missing before writing");
  const f = await db.select().from(factsTable).where(eq(factsTable.runId, run.id)).orderBy(asc(factsTable.n));
  const factByN = new Map(f.map((x) => [x.n, x]));
  const secs = await db.select().from(runSections).where(eq(runSections.runId, run.id)).orderBy(asc(runSections.idx));
  const total = outline.sections.length;
  const outlineText = outline.sections.map((s, i) => `${i + 1}. ${s.title}: ${s.beat} (about ${s.targetWords} words)`).join("\n");
  const system = writerSystem(run.format);

  for (const sec of secs) {
    if (sec.status === "done") continue;
    await checkCancel(ctx);
    const plan = outline.sections[sec.idx];
    await setStage(ctx, "writing", `Writing section ${sec.idx + 1} of ${total}: ${plan.title}`);

    const factsText = plan.factNs
      .map((n) => factByN.get(n))
      .filter((x): x is NonNullable<typeof x> => !!x)
      .map((x) => `[f${x.n}] ${x.claim}${x.allegation ? " [allegation]" : ""}`)
      .join("\n");

    const prev = sec.idx > 0 ? secs.find((s) => s.idx === sec.idx - 1) : undefined;
    const previousTail = prev?.raw ? splitSentences(narrationParagraphs(parseRaw(prev.raw)).join(" ")).slice(-3).join(" ").replace(/\{[^}]*\}/g, "") : "";

    let raw = "";
    let feedback: string | undefined;
    let attempts = 0;
    for (let attempt = 0; attempt < 2; attempt++) {
      attempts++;
      const res = await callLlm(ctx, {
        step: "section",
        model: "writer",
        system,
        cacheSystem: true,
        user: sectionPrompt({
          topic: run.topic,
          title: outline.title,
          index: sec.idx,
          total,
          sectionTitle: plan.title,
          beat: plan.beat,
          targetWords: plan.targetWords,
          outlineText,
          factsText: factsText || "(no facts assigned: keep this section short and general)",
          previousTail,
          voiceNotes: run.voiceNotes,
          language: run.language,
          feedback,
        }),
        maxTokens: Math.min(16_000, Math.max(1500, Math.round(plan.targetWords * 2.8))),
      });
      raw = autofix(res.text).text;
      if (res.stopReason === "max_tokens") await emit(db, run.id, "warn", `Section ${sec.idx + 1} hit its length limit and may end abruptly`);
      const items = parseRaw(raw);
      const issues = lint({ narration: narrationParagraphs(items), fullText: raw, mode: "visual" });
      const reasons = retryReasons(issues, sec.idx === 0, narrationWords(items), plan.targetWords);
      if (reasons.length === 0 || attempt === 1) break;
      feedback = reasons.map((r) => `- ${r}`).join("\n");
      await emit(db, run.id, "info", `Rewriting section ${sec.idx + 1} to fix ${reasons.length} problem${reasons.length === 1 ? "" : "s"}`);
    }

    await db.update(runSections).set({ raw, status: "done", attempts }).where(and(eq(runSections.runId, run.id), eq(runSections.idx, sec.idx)));
    sec.raw = raw;
    sec.status = "done";
    await db.update(runs).set({ progress: { done: sec.idx + 1, total } }).where(eq(runs.id, run.id));
  }
}

/* ------------------------------------------------------------------ assembly */

async function assembleStage(ctx: Ctx) {
  const { db, run } = ctx;
  await setStage(ctx, "audit", "Checking the script and building both versions");
  const secs = await db.select().from(runSections).where(eq(runSections.runId, run.id)).orderBy(asc(runSections.idx));
  const f = await db.select().from(factsTable).where(eq(factsTable.runId, run.id)).orderBy(asc(factsTable.n));
  const s = await db.select().from(sourcesTable).where(eq(sourcesTable.runId, run.id)).orderBy(asc(sourcesTable.n));

  const items: Item[] = [];
  secs.forEach((sec, i) => {
    let parsed = parseRaw(sec.raw ?? "");
    // A later section that repeats the Hook heading would restart the chapter list.
    if (i > 0 && parsed[0]?.kind === "heading" && parsed[0].text.toLowerCase() === "hook") parsed = parsed.slice(1);
    items.push(...parsed);
  });

  const visual = autofix(assembleVisual(items));
  const clean = autofix(assembleClean(items));
  const report = buildSourcesReport(items, f, s);
  const narr = narrationParagraphs(items);
  const wc = narrationWords(items);

  const issuesVisual = lint({ narration: narr, fullText: visual.text, mode: "visual" });
  const issuesClean = lint({ narration: narr, fullText: clean.text, mode: "clean" });
  const audit = {
    wordCount: wc,
    targetWords: run.words,
    duration: formatDuration(wc),
    fixes: [...new Set([...visual.fixes, ...clean.fixes])],
    issues: dedupe([...issuesVisual, ...issuesClean]),
    factsUsed: report.usedFactNs.length,
    factsTotal: f.length,
    unsourced: report.unsourced,
    invalidTags: report.invalidTags,
    rewrittenSections: secs.filter((x) => x.attempts > 1).length,
    shortBy: wc < run.words * 0.75 ? run.words - wc : 0,
  };

  await db.transaction(async (tx) => {
    await tx.delete(scripts).where(eq(scripts.runId, run.id));
    await tx.insert(scripts).values([
      { runId: run.id, kind: "visual", body: visual.text, wordCount: wordCount(assembleClean(items)), audit },
      { runId: run.id, kind: "clean", body: clean.text, wordCount: wc, audit },
      { runId: run.id, kind: "sources", body: report.text, wordCount: wordCount(report.text), audit: null },
    ]);
    await tx.update(runs).set({ status: "completed", stage: "done", finishedAt: new Date(), error: null }).where(eq(runs.id, run.id));
  });
  await emit(db, run.id, "info", `Done. ${wc.toLocaleString("en-US")} words, about ${audit.duration} of narration.`);
}

function dedupe(issues: LintIssue[]): LintIssue[] {
  const seen = new Set<string>();
  return issues.filter((i) => {
    const k = `${i.rule}|${i.snippet ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/* --------------------------------------------------------------- orchestration */

/** Runs every stage in order. Each stage skips itself if its result is already saved, so a restart resumes. */
export async function executeRun(deps: Deps, runId: string): Promise<void> {
  const run = (await deps.db.select().from(runs).where(eq(runs.id, runId)).limit(1))[0];
  if (!run) throw new Error(`run ${runId} not found`);
  const ctx: Ctx = { ...deps, run };
  const beat = setInterval(() => {
    void deps.db.update(runs).set({ heartbeatAt: new Date() }).where(eq(runs.id, runId)).catch(() => {});
  }, 20_000);
  beat.unref();
  try {
    await researchStage(ctx);
    ctx.run = (await deps.db.select().from(runs).where(eq(runs.id, runId)).limit(1))[0];
    await factsStage(ctx);
    await outlineStage(ctx);
    ctx.run = (await deps.db.select().from(runs).where(eq(runs.id, runId)).limit(1))[0];
    await writeStage(ctx);
    await assembleStage(ctx);
  } finally {
    clearInterval(beat);
  }
}

export async function failRun(db: Db, runId: string, message: string) {
  await db.update(runs).set({ status: "failed", stage: "done", error: message, finishedAt: new Date() }).where(eq(runs.id, runId));
  const r = await refundRun(db, runId, "Script could not be finished");
  await emit(db, runId, "error", r.refunded > 0 ? `${message} ${r.refunded.toLocaleString("en-US")} credits were returned.` : message);
}

export async function finishCancelled(db: Db, runId: string) {
  await db.update(runs).set({ status: "cancelled", stage: "done", finishedAt: new Date() }).where(eq(runs.id, runId));
  const keep = await creditsToKeep(db, runId);
  const r = await refundRun(db, runId, "Cancelled", { keep });
  await emit(db, runId, "info", keep > 0 ? `Cancelled. ${r.refunded.toLocaleString("en-US")} credits returned. Deep research that had already started is not refundable.` : "Cancelled. Credits returned.");
}

const GENERIC_FAILURE = "We could not finish this script because of a problem with one of our research or writing providers.";

/**
 * Runs one attempt and decides what happens next: finished, cancelled, failed with a refund,
 * or put back in the queue for another try after a delay.
 */
export async function runOnce(deps: Deps, runId: string): Promise<"completed" | "cancelled" | "failed" | "retry"> {
  try {
    await executeRun(deps, runId);
    return "completed";
  } catch (err) {
    if (err instanceof RunCancelled) {
      await finishCancelled(deps.db, runId);
      return "cancelled";
    }
    deps.log?.(`run ${runId} failed`, err);
    if (err instanceof PermanentRunError) {
      await failRun(deps.db, runId, err.message);
      return "failed";
    }
    if (err instanceof PermanentProviderError) {
      await failRun(deps.db, runId, `${GENERIC_FAILURE} It has been reported to us.`);
      return "failed";
    }
    const r = (await deps.db.select({ attempts: runs.attempts }).from(runs).where(eq(runs.id, runId)).limit(1))[0];
    if (r && r.attempts < MAX_ATTEMPTS) {
      const delayMs = 30_000 * r.attempts;
      await deps.db
        .update(runs)
        .set({ status: "queued", workerId: null, availableAt: new Date(Date.now() + delayMs) })
        .where(eq(runs.id, runId));
      await emit(deps.db, runId, "warn", `Something went wrong, trying again in ${Math.round(delayMs / 1000)} seconds.`);
      return "retry";
    }
    await failRun(deps.db, runId, `${GENERIC_FAILURE} We tried ${MAX_ATTEMPTS} times.`);
    return "failed";
  }
}
