import { TINYFISH_RUN_USD } from "./prices";
import {
  PermanentProviderError,
  TransientProviderError,
  type DeepResearchOptions,
  type DeepResearchResult,
  type FetchedPage,
  type SearchHit,
  type WebProvider,
} from "./types";

// Request and response shapes follow https://docs.tinyfish.ai (Search, Fetch and Research API references).
const SEARCH_URL = "https://api.search.tinyfish.ai";
const FETCH_URL = "https://api.fetch.tinyfish.ai";
const AGENT_BASE = "https://agent.tinyfish.ai";

export type TinyFishOptions = {
  apiKey: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  /** How often to ask whether a research run has finished. */
  pollMs?: number;
  /** Give up on a research run after this long (TinyFish's own budget is 45 minutes). */
  researchDeadlineMs?: number;
};

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT"]);

export class TinyFishProvider implements WebProvider {
  readonly name = "tinyfish";
  private f: typeof fetch;
  private sleep: (ms: number) => Promise<void>;
  private pollMs: number;
  private deadlineMs: number;

  constructor(private o: TinyFishOptions) {
    this.f = o.fetchImpl ?? fetch;
    this.sleep = o.sleep ?? wait;
    this.pollMs = o.pollMs ?? 10_000;
    this.deadlineMs = o.researchDeadlineMs ?? 50 * 60_000;
  }

  private headers(json = false): Record<string, string> {
    return { "X-API-Key": this.o.apiKey, ...(json ? { "Content-Type": "application/json" } : {}) };
  }

  /** Maps TinyFish HTTP errors to "retry later" or "stop, this will not work". */
  private async fail(res: Response, what: string): Promise<never> {
    const body = await res.text().catch(() => "");
    if (res.status === 401) throw new PermanentProviderError("The TinyFish API key was rejected.", "tinyfish_auth");
    if (res.status === 402) {
      throw new PermanentProviderError(`TinyFish says the free allowance is used up and the wallet is empty (${what}).`, "tinyfish_credits");
    }
    if (res.status === 403) {
      throw new PermanentProviderError(`TinyFish refused ${what}. Research may not be enabled for this account.`, "tinyfish_forbidden");
    }
    if (res.status === 400 || res.status === 422) {
      throw new PermanentProviderError(`TinyFish rejected ${what}: ${body.slice(0, 200)}`, "tinyfish_bad_request");
    }
    throw new TransientProviderError(`TinyFish ${what} returned ${res.status}`, res.status);
  }

  /** Runs a request, waiting and retrying on rate limits (429) and temporary outages (503). */
  private async withRetry(what: string, run: () => Promise<Response>, maxTries = 6): Promise<Response> {
    for (let i = 0; ; i++) {
      const res = await run();
      if (res.ok) return res;
      if ((res.status === 429 || res.status === 503 || res.status === 500) && i < maxTries) {
        const ra = Number(res.headers.get("retry-after"));
        await this.sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra, 120) * 1000 : Math.min(2000 * 2 ** i, 60_000));
        continue;
      }
      return this.fail(res, what);
    }
  }

  async search(query: string, opts: { purpose?: string; language?: string; signal?: AbortSignal } = {}): Promise<SearchHit[]> {
    const url = new URL(SEARCH_URL);
    url.searchParams.set("query", query);
    if (opts.purpose) url.searchParams.set("purpose", opts.purpose.slice(0, 2000));
    if (opts.language) url.searchParams.set("language", opts.language);
    const res = await this.withRetry("search", () => this.f(url, { headers: this.headers(), signal: opts.signal }));
    const j = (await res.json()) as { results?: { url?: string; title?: string; snippet?: string; site_name?: string }[] };
    return (j.results ?? [])
      .filter((r) => r.url)
      .map((r) => ({ url: r.url!, title: r.title ?? r.url!, snippet: r.snippet ?? "", siteName: r.site_name }));
  }

  async fetchPages(urls: string[], signal?: AbortSignal) {
    const pages: FetchedPage[] = [];
    const failed: { url: string; error: string }[] = [];
    for (let i = 0; i < urls.length; i += 10) {
      const batch = urls.slice(i, i + 10);
      const res = await this.withRetry("page fetch", () =>
        this.f(FETCH_URL, {
          method: "POST",
          headers: this.headers(true),
          body: JSON.stringify({ urls: batch, format: "markdown" }),
          // TinyFish allows 110 s per URL and 120 s per batch, so wait at least 150 s.
          signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(160_000)]) : AbortSignal.timeout(160_000),
        }),
      );
      const j = (await res.json()) as {
        results?: { url?: string; final_url?: string; title?: string | null; text?: unknown; published_date?: string | null }[];
        errors?: { url?: string; error?: string }[];
      };
      for (const r of j.results ?? []) {
        if (typeof r.text === "string" && r.text.trim()) {
          pages.push({ url: r.final_url ?? r.url ?? "", title: r.title ?? null, text: r.text, publishedDate: r.published_date ?? null });
        } else {
          failed.push({ url: r.url ?? "", error: "empty_content" });
        }
      }
      for (const e of j.errors ?? []) failed.push({ url: e.url ?? "", error: e.error ?? "unknown" });
    }
    return { pages, failed };
  }

  async deepResearch(query: string, opts: DeepResearchOptions): Promise<DeepResearchResult> {
    let id = opts.resumeId ?? null;
    if (!id) {
      const res = await this.withRetry(
        "research start",
        () =>
          this.f(`${AGENT_BASE}/v1/automation/run-research-async`, {
            method: "POST",
            headers: this.headers(true),
            body: JSON.stringify({ query: query.slice(0, 2000), mode: opts.mode, output_language: opts.language }),
            signal: opts.signal,
          }),
        60, // concurrency limit answers 429 with Retry-After 30, so waiting here is the queue
      );
      const j = (await res.json()) as { research_run_id?: string; error?: { message?: string } | null };
      if (!j.research_run_id) throw new TransientProviderError(`TinyFish did not start the research run: ${j.error?.message ?? "no id returned"}`);
      id = j.research_run_id;
      await opts.onStarted?.(id);
    }

    const deadline = Date.now() + this.deadlineMs;
    let lastNote = 0;
    while (Date.now() < deadline) {
      if (opts.signal?.aborted) throw new TransientProviderError("Research was stopped");
      const res = await this.withRetry("research status", () =>
        this.f(`${AGENT_BASE}/v1/research-run/${encodeURIComponent(id!)}`, { headers: this.headers(), signal: opts.signal }),
      );
      const j = (await res.json()) as {
        status?: string;
        deep_result?: { result?: string | null; citations?: (string | { url?: string })[] | null } | null;
        error?: { code?: string; message?: string } | null;
      };
      const status = j.status ?? "RUNNING";
      if (status === "COMPLETED") {
        const report = j.deep_result?.result ?? "";
        if (!report.trim()) throw new TransientProviderError("TinyFish finished the research but returned an empty report");
        const citations = (j.deep_result?.citations ?? [])
          .map((c) => (typeof c === "string" ? c : c?.url ?? ""))
          .filter((u) => /^https?:\/\//.test(u));
        return { externalId: id, report, citations: [...new Set(citations)], costUsd: TINYFISH_RUN_USD[opts.mode] };
      }
      if (TERMINAL.has(status)) {
        throw new TransientProviderError(`TinyFish research ${status.toLowerCase().replace("_", " ")}${j.error?.message ? `: ${j.error.message}` : ""}`);
      }
      if (Date.now() - lastNote > 60_000) {
        lastNote = Date.now();
        await opts.onProgress?.(`Deep research is still working (${status.toLowerCase()})`);
      }
      await this.sleep(this.pollMs);
    }
    throw new TransientProviderError("TinyFish research took longer than 50 minutes");
  }
}
