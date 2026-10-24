import { DEEP_RUN_CREDITS, PLANS, type PlanId } from "@/lib/pricing";

/** Credits to write a script of up to `upToWords` words. Standard research and both versions are included. */
export const SCRIPT_CREDIT_TIERS = [
  { upToWords: 1200, credits: 100 },
  { upToWords: 2500, credits: 150 },
  { upToWords: 5000, credits: 300 },
  { upToWords: 8000, credits: 500 },
  { upToWords: 10000, credits: 600 },
  { upToWords: 12500, credits: 750 },
  { upToWords: 25000, credits: 1500 },
  { upToWords: 30000, credits: 1800 },
] as const;

export const MIN_WORDS = 300;
export const MAX_WORDS = 30000;
export const SECTION_WORDS = 2500;

export type Depth = "standard" | "deep";

export function scriptCredits(words: number): number {
  if (!Number.isFinite(words) || words < MIN_WORDS || words > MAX_WORDS) {
    throw new RangeError(`words must be between ${MIN_WORDS} and ${MAX_WORDS}`);
  }
  const tier = SCRIPT_CREDIT_TIERS.find((t) => words <= t.upToWords);
  return tier!.credits;
}

/** Number of 2,500-word sections a script is written in. */
export function sectionCount(words: number): number {
  return Math.max(1, Math.ceil(words / SECTION_WORDS));
}

/** TinyFish research runs a deep script uses: one master run plus one per three sections. */
export function deepRunsFor(words: number): number {
  const sections = sectionCount(words);
  return sections === 1 ? 1 : 1 + Math.floor(sections / 3);
}

export type RunCost = {
  scriptCredits: number;
  deepRuns: number;
  deepCredits: number;
  total: number;
};

export function runCost(words: number, depth: Depth): RunCost {
  const base = scriptCredits(words);
  const deepRuns = depth === "deep" ? deepRunsFor(words) : 0;
  const deepCredits = deepRuns * DEEP_RUN_CREDITS;
  return { scriptCredits: base, deepRuns, deepCredits, total: base + deepCredits };
}

export function planFor(id: string) {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export type Eligibility = { ok: true } | { ok: false; reason: string };

/** Whether a plan may start this script, ignoring balance. */
export function planAllows(plan: PlanId | string, words: number, depth: Depth): Eligibility {
  const p = planFor(plan);
  if (words > p.maxWords) {
    return {
      ok: false,
      reason: `The ${p.name} plan allows scripts up to ${p.maxWords.toLocaleString("en-US")} words.`,
    };
  }
  if (depth === "deep" && !p.deepResearch) {
    return { ok: false, reason: `Deep research is available from the Creator plan. Your plan uses standard research.` };
  }
  return { ok: true };
}

/** Narration time at 150 words a minute, as "m:ss" or "h:mm:ss". */
export function formatDuration(words: number, wpm = 150): string {
  const total = Math.round((words / wpm) * 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
