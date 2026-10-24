import { costUsd } from "./prices";
import { PermanentProviderError, TransientProviderError, type LlmProvider, type LlmRequest, type LlmResult, type ModelRole } from "./types";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const RETRY_STATUS = new Set([408, 409, 429, 500, 502, 503, 504, 529]);

export type AnthropicOptions = {
  apiKey: string;
  models: Record<ModelRole, string>;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  /** Test hook: how long to wait between retries. */
  sleep?: (ms: number) => Promise<void>;
  endpoint?: string;
};

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  private f: typeof fetch;
  private sleep: (ms: number) => Promise<void>;

  constructor(private o: AnthropicOptions) {
    this.f = o.fetchImpl ?? fetch;
    this.sleep = o.sleep ?? wait;
  }

  async complete(req: LlmRequest, signal?: AbortSignal): Promise<LlmResult> {
    const model = this.o.models[req.model];
    const body = {
      model,
      max_tokens: req.maxTokens,
      system: req.cacheSystem
        ? [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }]
        : req.system,
      messages: [{ role: "user", content: req.user }],
    };
    const max = this.o.maxRetries ?? 5;
    let lastErr: unknown;
    for (let attempt = 0; attempt <= max; attempt++) {
      const started = Date.now();
      try {
        const res = await this.f(this.o.endpoint ?? ENDPOINT, {
          method: "POST",
          headers: {
            "x-api-key": this.o.apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
          signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(900_000)]) : AbortSignal.timeout(900_000),
        });
        if (res.ok) {
          const j = (await res.json()) as {
            content?: { type: string; text?: string }[];
            stop_reason?: string | null;
            usage?: {
              input_tokens?: number;
              output_tokens?: number;
              cache_creation_input_tokens?: number | null;
              cache_read_input_tokens?: number | null;
            };
          };
          const text = (j.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
          const usage = {
            inputTokens: j.usage?.input_tokens ?? 0,
            outputTokens: j.usage?.output_tokens ?? 0,
            cacheReadTokens: j.usage?.cache_read_input_tokens ?? 0,
            cacheWriteTokens: j.usage?.cache_creation_input_tokens ?? 0,
          };
          return { text, model, usage, costUsd: costUsd(model, usage), ms: Date.now() - started, stopReason: j.stop_reason ?? null };
        }
        const detail = await res.text().catch(() => "");
        if (res.status === 401 || res.status === 403) {
          throw new PermanentProviderError("The Anthropic API key was rejected.", "anthropic_auth");
        }
        if (res.status === 400 || res.status === 404 || res.status === 413 || res.status === 422) {
          throw new PermanentProviderError(`Anthropic rejected the request (${res.status}): ${detail.slice(0, 300)}`, "anthropic_bad_request");
        }
        if (!RETRY_STATUS.has(res.status)) {
          throw new TransientProviderError(`Anthropic returned ${res.status}: ${detail.slice(0, 200)}`, res.status);
        }
        lastErr = new TransientProviderError(`Anthropic returned ${res.status}`, res.status);
        if (attempt === max) break;
        const ra = Number(res.headers.get("retry-after"));
        await this.sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra, 60) * 1000 : Math.min(2 ** attempt * 1000, 30_000));
      } catch (err) {
        if (err instanceof PermanentProviderError) throw err;
        if (signal?.aborted) throw err;
        lastErr = err;
        if (attempt === max) break;
        await this.sleep(Math.min(2 ** attempt * 1000, 30_000));
      }
    }
    throw lastErr instanceof Error ? lastErr : new TransientProviderError("Anthropic request failed");
  }
}
