import { wordCount } from "@/lib/core/lint";
import type {
  DeepResearchOptions,
  DeepResearchResult,
  FetchedPage,
  LlmProvider,
  LlmRequest,
  LlmResult,
  SearchHit,
  WebProvider,
} from "./types";

// Offline stand-ins so the whole product can run without API keys. Everything they produce is
// clearly placeholder text. They exist to exercise the pipeline, credits and screens, not to write scripts.

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const DELAY = () => Number(process.env.DEMO_DELAY_MS ?? 350);

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "topic";
const grab = (text: string, re: RegExp) => text.match(re)?.[1];

export class DemoWeb implements WebProvider {
  readonly name = "demo";

  async search(query: string): Promise<SearchHit[]> {
    await delay(DELAY());
    const s = slug(query);
    return Array.from({ length: 6 }, (_, i) => ({
      url: `https://demo.example/${s}/${i + 1}`,
      title: `Demo source ${i + 1} about ${query}`,
      snippet: "Placeholder search result.",
    }));
  }

  async fetchPages(urls: string[]) {
    await delay(DELAY());
    const pages: FetchedPage[] = urls.map((u, i) => ({
      url: u,
      title: `Demo page ${i + 1}`,
      text: `Placeholder page ${i + 1}. This text stands in for a real article. It would normally contain dated, checkable facts about the topic, the people involved and what happened next. Everything here is invented so the product can be tried without any API keys. Demo figure ${i + 3} is not a real statistic, and no claim on this page should be repeated outside the demo. A real page would run to many paragraphs of reporting.`,
    }));
    return { pages, failed: [] };
  }

  async deepResearch(query: string, opts: DeepResearchOptions): Promise<DeepResearchResult> {
    const id = opts.resumeId ?? `demo-${Date.now().toString(36)}`;
    if (!opts.resumeId) await opts.onStarted?.(id);
    await opts.onProgress?.("Demo deep research is running");
    await delay(DELAY() * 3);
    const s = slug(query);
    return {
      externalId: id,
      report: `# Demo research report\n\nThis is placeholder research about "${query}". It is not real.\n\n- Placeholder finding one about ${query}.\n- Placeholder finding two about ${query}.`,
      citations: Array.from({ length: 10 }, (_, i) => `https://demo.example/${s}/deep/${i + 1}`),
      costUsd: 0,
    };
  }
}

const TEMPLATES = [
  "This line stands in for a real sentence about the topic and carries a placeholder claim.",
  "A real script would tell this part of the story with specific names, dates and numbers.",
  "The research for this demo is invented, so treat every statement here as a stand-in.",
  "Here the narrator would connect the last beat to the next one and raise the stakes.",
  "In a real run this sentence would be drawn from a sourced fact in your research list.",
];

export class DemoLlm implements LlmProvider {
  readonly name = "demo";

  async complete(req: LlmRequest): Promise<LlmResult> {
    await delay(DELAY());
    const text = this.respond(req);
    const usage = {
      inputTokens: Math.round((req.system.length + req.user.length) / 4),
      outputTokens: Math.round(text.length / 4),
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
    return { text, model: `demo-${req.model}`, usage, costUsd: 0, ms: DELAY(), stopReason: "end_turn" };
  }

  private respond(req: LlmRequest): string {
    const topic = grab(req.user, /TOPIC: (.+)/) ?? "the topic";
    switch (req.step) {
      case "queries": {
        const n = Number(grab(req.user, /Return exactly (\d+)/) ?? 4);
        return JSON.stringify({ queries: Array.from({ length: n }, (_, i) => `${topic} demo angle ${i + 1}`) });
      }
      case "facts": {
        const nSources = (req.user.match(/^\[S\d+\]/gm) ?? []).length || 1;
        const max = Number(grab(req.user, /Return up to (\d+) facts/) ?? 20);
        const count = Math.min(max, Math.max(12, Math.round(max * 0.8)));
        const facts = Array.from({ length: count }, (_, i) => ({
          claim: `Demo fact ${i + 1} about ${topic}. This is a placeholder, not a real finding.`,
          sources: [(i % nSources) + 1],
          confidence: ["high", "medium", "low"][i % 3],
          allegation: i === 6,
        }));
        return JSON.stringify({ facts });
      }
      case "outline": {
        const n = Number(grab(req.user, /exactly (\d+) sections/) ?? 3);
        const total = Number(grab(req.user, /total of (\d+) words/) ?? 1500);
        const nFacts = Number(grab(req.user, /FACT COUNT: (\d+)/) ?? 12);
        const per = Math.round(total / n);
        return JSON.stringify({
          title: `Demo: ${topic}`,
          sections: Array.from({ length: n }, (_, i) => ({
            title: i === 0 ? "The opening" : i === n - 1 ? "Where things stand" : `Part ${i + 1}`,
            beat: i === 0 ? "Hook the viewer and set the question" : i === n - 1 ? "Resolve and call to subscribe" : "Raise the stakes",
            targetWords: per,
            factNs: Array.from({ length: nFacts }, (_, k) => k + 1).filter((k) => k % n === i),
          })),
        });
      }
      case "section":
        return this.section(req.user, topic);
      default:
        return "{}";
    }
  }

  private section(user: string, topic: string): string {
    const idx = Number(grab(user, /SECTION (\d+) OF/) ?? 1) - 1;
    const total = Number(grab(user, /SECTION \d+ OF (\d+)/) ?? 1);
    const target = Number(grab(user, /about (\d+) words/) ?? 400);
    const facts = [...user.matchAll(/^\[f(\d+)\]/gm)].map((m) => Number(m[1]));
    const tag = (k: number) => (facts.length ? ` {f${facts[k % facts.length]}}` : "");
    const lines: string[] = [];
    let words = 0;
    let p = 0;
    let part = 0;

    const heading = (t: string) => lines.push(`## ${t}`, "");
    heading(idx === 0 ? "Hook" : `Section ${idx + 1}`);
    if (idx === 0) {
      lines.push(`[B-ROLL: Demo footage related to ${topic}]`);
      const hook = `This is a demo script about ${topic}, and every fact in it is a placeholder.${tag(0)} It looks like a real script, but it was written without any real research.${tag(1)} So what would the real thing sound like?`;
      lines.push(hook, "");
      words += wordCount(hook);
    }
    while (words < target) {
      if (p > 0 && p % 3 === 0 && words < target - 200) heading(`Part ${idx + 1}.${++part}`);
      if (p % 2 === 0) lines.push(`[${["B-ROLL", "IMAGE", "CLIP", "TEXT ON SCREEN"][p % 4]}: ${p % 4 === 3 ? `"Demo ${p}"` : `Demo visual ${p} for ${topic}`}]`);
      const para = [0, 1, 2]
        .map((k) => TEMPLATES[(p + k) % TEMPLATES.length] + tag(p + k))
        .join(" ");
      lines.push(para, "");
      words += wordCount(para);
      p++;
    }
    const close =
      idx === total - 1
        ? `That is where this placeholder story ends. If a real script helped you, subscribe for the next one.${tag(2)}`
        : `And that was only the start, because the next part raises the stakes.${tag(2)}`;
    lines.push(close);
    return lines.join("\n");
  }
}
