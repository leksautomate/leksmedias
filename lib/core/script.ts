import { splitSentences, wordCount } from "@/lib/core/lint";

export type Sentence = { text: string; factNs: number[] };
export type Item =
  | { kind: "heading"; text: string }
  | { kind: "cue"; text: string }
  | { kind: "narration"; text: string; sentences: Sentence[] };

export type SourceRow = { n: number; url: string; title?: string | null };
export type FactRow = { n: number; claim: string; sourceNs: number[]; allegation?: boolean };

const TAG = /\{\s*(?:f\d+\s*(?:,\s*f\d+\s*)*|\d+\s*(?:,\s*\d+\s*)*)\}/g;

function tagNumbers(s: string): number[] {
  const nums: number[] = [];
  for (const m of s.matchAll(TAG)) {
    for (const d of m[0].matchAll(/\d+/g)) nums.push(Number(d[0]));
  }
  return [...new Set(nums)];
}

export function stripTags(s: string): string {
  return s.replace(TAG, "").replace(/[ \t]{2,}/g, " ").replace(/\s+([.,!?;])/g, "$1").trim();
}

/** Parses one section of raw model output into headings, cues and tagged narration. */
export function parseRaw(raw: string): Item[] {
  const items: Item[] = [];
  let para: string[] = [];

  const flush = () => {
    if (para.length === 0) return;
    const joined = para.join(" ").trim();
    para = [];
    if (!joined) return;
    const sentences = splitSentences(joined).map((s) => ({ text: stripTags(s), factNs: tagNumbers(s) }));
    items.push({ kind: "narration", text: sentences.map((s) => s.text).join(" "), sentences });
  };

  for (const rawLine of raw.replace(/\r/g, "").split("\n")) {
    const line = rawLine.replace(/\*\*/g, "").trim();
    if (!line || line.startsWith("```")) {
      flush();
      continue;
    }
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flush();
      items.push({ kind: "heading", text: heading[1].trim() });
      continue;
    }
    if (line.startsWith("[") && line.endsWith("]") && !line.slice(1, -1).includes("[")) {
      flush();
      items.push({ kind: "cue", text: line.slice(1, -1).trim() });
      continue;
    }
    para.push(line);
  }
  flush();
  return items;
}

export function narrationParagraphs(items: Item[]): string[] {
  return items.flatMap((i) => (i.kind === "narration" ? [i.text] : []));
}

export function narrationWords(items: Item[]): number {
  return narrationParagraphs(items).reduce((n, p) => n + wordCount(p), 0);
}

function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

/** Editor version: chapter headings with timestamps from word count, cues above the narration they go with. */
export function assembleVisual(items: Item[], wpm = 150): string {
  type Chapter = { title: string; body: string[]; words: number };
  const chapters: Chapter[] = [];
  const open = (title: string) => {
    const c: Chapter = { title, body: [], words: 0 };
    chapters.push(c);
    return c;
  };
  let cur: Chapter | null = null;
  for (const it of items) {
    if (it.kind === "heading") {
      cur = open(it.text);
      continue;
    }
    cur ??= open("Hook");
    if (it.kind === "cue") cur.body.push(`[${it.text}]`);
    else {
      cur.body.push(it.text);
      cur.words += wordCount(it.text);
    }
  }
  let t = 0;
  return chapters
    .map((c) => {
      const start = t;
      t += (c.words / wpm) * 60;
      return `${c.title.toUpperCase()} (${clock(start)}-${clock(t)})\n\n${c.body.join("\n\n")}`;
    })
    .join("\n\n\n")
    .trim();
}

/** Voiceover version: narration only. No headings, cues, tags or timestamps. */
export function assembleClean(items: Item[]): string {
  return narrationParagraphs(items).join("\n\n").trim();
}

export type SourcesReport = {
  text: string;
  usedFactNs: number[];
  invalidTags: number[];
  unsourced: string[];
  sourceNsUsed: number[];
};

/** Builds the "Sources and fact check" block from the fact tags the writer attached. */
export function buildSourcesReport(items: Item[], facts: FactRow[], sources: SourceRow[]): SourcesReport {
  const factByN = new Map(facts.map((f) => [f.n, f]));
  const used = new Set<number>();
  const invalid = new Set<number>();
  const unsourced: string[] = [];

  for (const it of items) {
    if (it.kind !== "narration") continue;
    for (const s of it.sentences) {
      if (s.factNs.length === 0) {
        if (/\d/.test(s.text) || /\b(million|billion|percent)\b/i.test(s.text)) unsourced.push(s.text);
        continue;
      }
      for (const n of s.factNs) (factByN.has(n) ? used : invalid).add(n);
    }
  }

  const usedFactNs = [...used].sort((a, b) => a - b);
  const sourceNsUsed = [...new Set(usedFactNs.flatMap((n) => factByN.get(n)!.sourceNs))].sort((a, b) => a - b);

  const lines: string[] = ["SOURCES AND FACT CHECK", "", "Claims in this script"];
  if (usedFactNs.length === 0) lines.push("None of the sentences carried a source tag.");
  usedFactNs.forEach((n, i) => {
    const f = factByN.get(n)!;
    const srcs = f.sourceNs.length ? f.sourceNs.map((s) => `[${s}]`).join(" ") : "no source listed";
    lines.push(`${i + 1}. ${f.claim}${f.allegation ? " (allegation)" : ""}`, `   Sources: ${srcs}`);
  });
  if (unsourced.length) {
    lines.push("", "Lines to verify (they contain numbers but no source)");
    for (const u of unsourced) lines.push(`- ${u}`);
  }
  lines.push("", "Sources");
  const srcByN = new Map(sources.map((s) => [s.n, s]));
  for (const n of sourceNsUsed) {
    const s = srcByN.get(n);
    if (s) lines.push(`[${n}] ${s.title ? s.title + ". " : ""}${s.url}`);
  }
  return { text: lines.join("\n"), usedFactNs, invalidTags: [...invalid].sort((a, b) => a - b), unsourced, sourceNsUsed };
}
