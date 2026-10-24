// Deterministic checks for the "sounds like AI" patterns, and for the clean (voiceover) format.
// Runs on every script. Mechanical problems are fixed automatically, the rest are reported.

export type Severity = "fixed" | "warn" | "error";
export type LintIssue = { rule: string; severity: Severity; message: string; snippet?: string };
export type LintMode = "visual" | "clean";

const SETUP_PHRASES =
  /\b(here'?s the thing|the bottom line|this is why it matters|here'?s the (?:truth|catch)|let that sink in|here'?s what (?:no one|nobody) (?:tells|talks)|the truth (?:no one|nobody) talks about|what (?:most people|everyone) (?:fail|fails|doesn'?t|don'?t) (?:to )?realize)\b/i;
const MOST_OPENER = /(?:^|[.!?]["')\]]?\s+)(Most (?:people|founders|creators|CEOs|viewers|businesses|companies)\b[^.!?]{0,30})/;
const HYPE = /\b(game[- ]?changing|transformational|revolutionary|cutting[- ]edge|unlock your potential|powerful)\b/i;
const NO_FRAGMENTS = /\bNo [^.!?\n]{1,40}[.!?]\s+No [^.!?\n]{1,40}[.!?]/;
const NOT_X_Y = /\b(?:it|this|that)(?:'s| is) not [^.!?]{1,60}[,;] ?(?:it|this|that)(?:'s| is)\b/gi;
const TURN_WORDS = /\b(but|however|yet|until|except|instead|so why|so how|why did|how did|what happened)\b/i;

/** Splits narration into sentences, keeping any trailing {f1,f2} tags attached. */
export function splitSentences(text: string): string[] {
  const out = text.match(/[^.!?]+(?:[.!?]+["')\]]*)(?:\s*\{[^}]*\})*/g);
  return (out ?? [text]).map((s) => s.trim()).filter(Boolean);
}

export function wordCount(text: string): number {
  const t = text.replace(/\{[^}]*\}/g, " ").trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Fixes dashes and spacing. Returns the new text and a list of what changed. */
export function autofix(text: string): { text: string; fixes: string[] } {
  const fixes: string[] = [];
  let out = text;

  const dashes = (out.match(/—|\s–\s/g) ?? []).length;
  if (dashes > 0) {
    out = out
      .replace(/\s*—\s*/g, ", ")
      .replace(/\s+–\s+/g, ", ")
      .replace(/,\s*,/g, ",")
      .replace(/,\s*([.!?])/g, "$1");
    fixes.push(`Replaced ${dashes} dash${dashes === 1 ? "" : "es"} with commas`);
  }
  const spaces = (out.match(/[ \t]{2,}/g) ?? []).length;
  if (spaces > 0) {
    out = out.replace(/([^\n])[ \t]{2,}/g, "$1 ");
    fixes.push("Removed doubled spaces");
  }
  return { text: out, fixes };
}

export type LintInput = {
  /** Narration paragraphs (tags already removed). */
  narration: string[];
  /** Every line of the final script for this mode, used for format checks. */
  fullText: string;
  mode: LintMode;
};

export function lint({ narration, fullText, mode }: LintInput): LintIssue[] {
  const issues: LintIssue[] = [];
  const joined = narration.join("\n");

  if (/—/.test(fullText) || /\s–\s/.test(fullText)) {
    issues.push({ rule: "dash", severity: "error", message: "Contains an em dash or spaced en dash." });
  }

  const setup = joined.match(SETUP_PHRASES);
  if (setup) issues.push({ rule: "setup_phrase", severity: "warn", message: "Uses a stock setup phrase.", snippet: setup[0] });

  const most = joined.match(MOST_OPENER);
  if (most) issues.push({ rule: "most_opener", severity: "warn", message: 'A sentence starts with "Most people"-style framing.', snippet: most[1].trim() });

  const hype = joined.match(HYPE);
  if (hype) issues.push({ rule: "hype_word", severity: "warn", message: "Uses an empty hype word.", snippet: hype[0] });

  if (NO_FRAGMENTS.test(joined)) {
    issues.push({ rule: "no_fragments", severity: "warn", message: 'Uses a "No X. No Y." run of fragments.' });
  }

  const notXY = joined.match(NOT_X_Y) ?? [];
  if (notXY.length > 1) {
    issues.push({ rule: "not_x_y", severity: "warn", message: `Uses the "it's not X, it's Y" contrast ${notXY.length} times (limit 1).` });
  }

  const colons = (joined.match(/:(?!\d)/g) ?? []).length;
  if (colons > 3) {
    issues.push({ rule: "colons", severity: "warn", message: `Uses ${colons} colons in narration (limit 3).` });
  }

  // Three or more very short sentences in a row read as machine rhythm.
  for (const para of narration) {
    const sents = splitSentences(para).map((s) => wordCount(s));
    let run = 0;
    for (const n of sents) {
      run = n <= 4 ? run + 1 : 0;
      if (run >= 3) {
        issues.push({ rule: "choppy", severity: "warn", message: "Three very short sentences in a row.", snippet: para.slice(0, 80) });
        break;
      }
    }
  }

  const first = narration[0];
  if (first) {
    const n = wordCount(first);
    if (n > 100) issues.push({ rule: "hook_length", severity: "warn", message: `Opening paragraph is ${n} words (aim for under 100).` });
    if (!TURN_WORDS.test(first)) issues.push({ rule: "hook_turn", severity: "warn", message: 'The hook has no turn ("but", "however" or a question).' });
  }

  if (mode === "clean") {
    if (/[\[\]]/.test(fullText)) issues.push({ rule: "brackets", severity: "error", message: "Clean version contains square brackets." });
    if (/https?:\/\/|www\./i.test(fullText)) issues.push({ rule: "url", severity: "error", message: "Clean version contains a URL." });
    if (/\(\s*\d{1,2}:\d{2}/.test(fullText)) issues.push({ rule: "timestamp", severity: "error", message: "Clean version contains a timestamp." });
    if (/^[A-Z][A-Z ]{1,20}:\s/m.test(fullText)) issues.push({ rule: "speaker_label", severity: "error", message: "Clean version contains a speaker label." });
    if (/\{[^}]*\}/.test(fullText)) issues.push({ rule: "fact_tag", severity: "error", message: "Clean version still contains fact tags." });
  }
  return issues;
}
