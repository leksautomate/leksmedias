import { describe, expect, it } from "vitest";
import { AnthropicProvider } from "@/lib/providers/anthropic";
import { costUsd } from "@/lib/providers/prices";
import { TinyFishProvider } from "@/lib/providers/tinyfish";
import { PermanentProviderError, TransientProviderError } from "@/lib/providers/types";

type Call = { url: string; init?: RequestInit };
type Reply = Response | ((c: Call) => Response);

/** A fake fetch that answers from a script and remembers every request. */
function scripted(replies: Reply[]) {
  const calls: Call[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call = { url: input.toString(), init };
    calls.push(call);
    const next = replies.shift();
    if (!next) throw new Error(`unexpected extra request to ${call.url}`);
    return typeof next === "function" ? next(call) : next;
  }) as typeof fetch;
  return { impl, calls };
}
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
const bodyOf = (c: Call) => JSON.parse(String(c.init?.body));

const models = { writer: "claude-sonnet-5-5", fast: "claude-haiku-5-5" } as const;
const okMessage = (extra: object = {}) =>
  json({
    content: [{ type: "text", text: "Hello there" }],
    stop_reason: "end_turn",
    usage: { input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 20000, cache_creation_input_tokens: 0 },
    ...extra,
  });

describe("prices", () => {
  it("costs Sonnet 5.5 by the published rates", () => {
    // 1000 in x $2 + 500 out x $10 + 20000 cached x $0.10, per million
    expect(costUsd("claude-sonnet-5-5", { inputTokens: 1000, outputTokens: 500, cacheReadTokens: 20000, cacheWriteTokens: 0 })).toBeCloseTo(0.009, 6);
  });
  it("charges Haiku 5.5 more for prompts over 100k tokens", () => {
    const small = costUsd("claude-haiku-5-5", { inputTokens: 90_000, outputTokens: 1000, cacheReadTokens: 0, cacheWriteTokens: 0 });
    const large = costUsd("claude-haiku-5-5", { inputTokens: 110_000, outputTokens: 1000, cacheReadTokens: 0, cacheWriteTokens: 0 });
    expect(small).toBeCloseTo((90_000 * 0.1 + 1000 * 0.5) / 1e6, 8);
    expect(large).toBeCloseTo((110_000 * 0.5 + 1000 * 2.5) / 1e6, 8);
  });
  it("logs unknown models as free instead of guessing", () => {
    expect(costUsd("mystery-model", { inputTokens: 1e6, outputTokens: 1e6, cacheReadTokens: 0, cacheWriteTokens: 0 })).toBe(0);
  });
});

describe("AnthropicProvider", () => {
  const mk = (replies: Reply[], extra: { maxRetries?: number } = {}) => {
    const s = scripted(replies);
    const sleeps: number[] = [];
    const p = new AnthropicProvider({ apiKey: "sk-test", models, fetchImpl: s.impl, sleep: async (ms) => void sleeps.push(ms), ...extra });
    return { p, ...s, sleeps };
  };
  const req = { step: "section", model: "writer" as const, system: "RULES", user: "write", maxTokens: 4000 };

  it("sends the documented headers and body, with the system prompt marked for caching", async () => {
    const { p, calls } = mk([okMessage()]);
    const r = await p.complete({ ...req, cacheSystem: true });
    const headers = calls[0].init!.headers as Record<string, string>;
    expect(calls[0].url).toBe("https://api.anthropic.com/v1/messages");
    expect(headers["x-api-key"]).toBe("sk-test");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    const b = bodyOf(calls[0]);
    expect(b.model).toBe("claude-sonnet-5-5");
    expect(b.max_tokens).toBe(4000);
    expect(b.system).toEqual([{ type: "text", text: "RULES", cache_control: { type: "ephemeral" } }]);
    expect(b.messages).toEqual([{ role: "user", content: "write" }]);
    expect(b).not.toHaveProperty("temperature");
    expect(r.text).toBe("Hello there");
    expect(r.usage).toEqual({ inputTokens: 1000, outputTokens: 500, cacheReadTokens: 20000, cacheWriteTokens: 0 });
    expect(r.costUsd).toBeCloseTo(0.009, 6);
  });

  it("sends a plain system string when caching is off, and picks the fast model", async () => {
    const { p, calls } = mk([okMessage()]);
    await p.complete({ ...req, model: "fast" });
    expect(bodyOf(calls[0]).system).toBe("RULES");
    expect(bodyOf(calls[0]).model).toBe("claude-haiku-5-5");
  });

  it("joins several text blocks and reports truncation", async () => {
    const { p } = mk([json({ content: [{ type: "text", text: "A" }, { type: "thinking" }, { type: "text", text: "B" }], stop_reason: "max_tokens", usage: { input_tokens: 1, output_tokens: 1 } })]);
    const r = await p.complete(req);
    expect(r.text).toBe("AB");
    expect(r.stopReason).toBe("max_tokens");
  });

  it("retries overload (529) and rate limits (429), honouring retry-after", async () => {
    const { p, calls, sleeps } = mk([json({}, 529), json({}, 429, { "retry-after": "7" }), okMessage()]);
    const r = await p.complete(req);
    expect(r.text).toBe("Hello there");
    expect(calls).toHaveLength(3);
    expect(sleeps).toEqual([1000, 7000]);
  });

  it("does not retry a rejected key or a bad request", async () => {
    const a = mk([json({}, 401)]);
    await expect(a.p.complete(req)).rejects.toBeInstanceOf(PermanentProviderError);
    expect(a.calls).toHaveLength(1);
    const b = mk([json({ error: { message: "bad" } }, 400)]);
    await expect(b.p.complete(req)).rejects.toMatchObject({ code: "anthropic_bad_request" });
    expect(b.calls).toHaveLength(1);
  });

  it("gives up with a transient error after the retry budget", async () => {
    const { p, calls } = mk([json({}, 503), json({}, 503), json({}, 503)], { maxRetries: 2 });
    await expect(p.complete(req)).rejects.toBeInstanceOf(TransientProviderError);
    expect(calls).toHaveLength(3);
  });

  it("retries a dropped connection", async () => {
    const { p, calls } = mk([() => { throw new TypeError("fetch failed"); }, okMessage()]);
    expect((await p.complete(req)).text).toBe("Hello there");
    expect(calls).toHaveLength(2);
  });
});

describe("TinyFishProvider", () => {
  const mk = (replies: Reply[], opts: { pollMs?: number; researchDeadlineMs?: number; realSleep?: boolean } = {}) => {
    const s = scripted(replies);
    const sleeps: number[] = [];
    const { realSleep, ...rest } = opts;
    const sleep = async (ms: number) => {
      sleeps.push(ms);
      if (realSleep) await new Promise((r) => setTimeout(r, ms));
    };
    const p = new TinyFishProvider({ apiKey: "tf-key", fetchImpl: s.impl, sleep, pollMs: 10, ...rest });
    return { p, ...s, sleeps };
  };

  it("searches with the documented query parameters and key header", async () => {
    const { p, calls } = mk([json({ query: "q", results: [{ position: 1, title: "T", url: "https://a.com/x", snippet: "S", site_name: "a.com" }, { title: "no url" }], total_results: 2, page: 0 })]);
    const hits = await p.search("blockbuster netflix 2000", { purpose: "script research", language: "en" });
    const u = new URL(calls[0].url);
    expect(u.origin + u.pathname).toBe("https://api.search.tinyfish.ai/");
    expect(u.searchParams.get("query")).toBe("blockbuster netflix 2000");
    expect(u.searchParams.get("purpose")).toBe("script research");
    expect((calls[0].init!.headers as Record<string, string>)["X-API-Key"]).toBe("tf-key");
    expect(hits).toEqual([{ url: "https://a.com/x", title: "T", snippet: "S", siteName: "a.com" }]);
  });

  it("waits and retries when rate limited", async () => {
    const { p, sleeps } = mk([json({}, 429, { "retry-after": "5" }), json({ results: [] })]);
    expect(await p.search("x")).toEqual([]);
    expect(sleeps).toEqual([5000]);
  });

  it("fetches pages in batches of at most 10 and separates failures", async () => {
    const urls = Array.from({ length: 23 }, (_, i) => `https://site.com/${i}`);
    const reply = (c: Call) => {
      const batch: string[] = bodyOf(c).urls;
      return json({
        results: batch.slice(0, -1).map((u) => ({ url: u, final_url: u, title: "Page", text: `# Body of ${u}` })),
        errors: [{ url: batch[batch.length - 1], error: "bot_blocked", status: 403 }],
      });
    };
    const { p, calls } = mk([reply, reply, reply]);
    const r = await p.fetchPages(urls);
    expect(calls.map((c) => bodyOf(c).urls.length)).toEqual([10, 10, 3]);
    expect(bodyOf(calls[0]).format).toBe("markdown");
    expect(r.pages).toHaveLength(20);
    expect(r.failed).toHaveLength(3);
    expect(r.failed[0]).toEqual({ url: "https://site.com/9", error: "bot_blocked" });
  });

  it("treats a page with no text as failed", async () => {
    const { p } = mk([json({ results: [{ url: "https://a.com", text: "   " }, { url: "https://b.com", text: "real text" }], errors: [] })]);
    const r = await p.fetchPages(["https://a.com", "https://b.com"]);
    expect(r.pages.map((x) => x.url)).toEqual(["https://b.com"]);
    expect(r.failed).toEqual([{ url: "https://a.com", error: "empty_content" }]);
  });

  it("stops (does not retry) when the free allowance and wallet are exhausted", async () => {
    const { p, calls } = mk([json({ error: { code: "INSUFFICIENT_CREDITS" } }, 402)]);
    await expect(p.fetchPages(["https://a.com"])).rejects.toMatchObject({ code: "tinyfish_credits" });
    expect(calls).toHaveLength(1);
  });

  describe("deep research", () => {
    // Each is a function so every poll gets a fresh Response (a body can only be read once).
    const start = () => json({ research_run_id: "rr_1", error: null });
    const running = () => json({ research_run_id: "rr_1", status: "RUNNING" });
    const done = (extra: object = {}) => () =>
      json({
        research_run_id: "rr_1",
        status: "COMPLETED",
        deep_result: { result: "# Report\nFindings...", citations: ["https://a.com/1", "https://a.com/1", "ftp://bad", { url: "https://b.com/2" }] },
        ...extra,
      });

    it("starts, polls until complete, and returns the report with de-duplicated citations", async () => {
      const started: string[] = [];
      const { p, calls } = mk([start, running, running, done()]);
      const r = await p.deepResearch("topic", { mode: "deep", language: "en", onStarted: (id) => void started.push(id) });
      expect(started).toEqual(["rr_1"]);
      expect(calls[0].url).toBe("https://agent.tinyfish.ai/v1/automation/run-research-async");
      expect(bodyOf(calls[0])).toEqual({ query: "topic", mode: "deep", output_language: "en" });
      expect(calls[1].url).toBe("https://agent.tinyfish.ai/v1/research-run/rr_1");
      expect(r.report).toContain("Findings");
      expect(r.citations).toEqual(["https://a.com/1", "https://b.com/2"]);
      expect(r.costUsd).toBe(2);
    });

    it("bills a max run at $3", async () => {
      const { p } = mk([start, done()]);
      expect((await p.deepResearch("t", { mode: "max", language: "en" })).costUsd).toBe(3);
    });

    it("resumes an existing run without starting (or paying for) a new one", async () => {
      const { p, calls } = mk([done()]);
      const r = await p.deepResearch("t", { mode: "deep", language: "en", resumeId: "rr_9" });
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toContain("/research-run/rr_9");
      expect(r.externalId).toBe("rr_9");
    });

    it("waits out the concurrency limit (429 with Retry-After 30)", async () => {
      const { p, sleeps } = mk([json({ error: { code: "RATE_LIMIT_EXCEEDED" } }, 429, { "retry-after": "30" }), start, done()]);
      await p.deepResearch("t", { mode: "deep", language: "en" });
      expect(sleeps[0]).toBe(30_000);
    });

    it("raises a transient error when the run fails, and a permanent one when research is not enabled", async () => {
      const failed = mk([start, json({ status: "FAILED", error: { message: "source error" } })]);
      await expect(failed.p.deepResearch("t", { mode: "deep", language: "en" })).rejects.toBeInstanceOf(TransientProviderError);
      const forbidden = mk([json({}, 403)]);
      await expect(forbidden.p.deepResearch("t", { mode: "deep", language: "en" })).rejects.toMatchObject({ code: "tinyfish_forbidden" });
    });

    it("rejects an empty report", async () => {
      const { p } = mk([start, json({ status: "COMPLETED", deep_result: { result: "  ", citations: [] } })]);
      await expect(p.deepResearch("t", { mode: "deep", language: "en" })).rejects.toBeInstanceOf(TransientProviderError);
    });

    it("gives up after the deadline", async () => {
      const { p } = mk([start, running, running, running], { researchDeadlineMs: 20, pollMs: 25, realSleep: true });
      await expect(p.deepResearch("t", { mode: "deep", language: "en" })).rejects.toThrow(/longer than/);
    });
  });
});
