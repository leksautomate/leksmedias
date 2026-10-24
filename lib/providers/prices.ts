import type { Usage } from "./types";

// USD per million tokens. Source: https://platform.claude.com/docs/en/about-claude/pricing (checked 2026-10-24).
// Cache writes are the 5 minute price. Update this table when prices change.
type Price = { in: number; out: number; cacheWrite: number; cacheRead: number };

const PRICES: Record<string, Price> = {
  "claude-haiku-5-5": { in: 0.1, out: 0.5, cacheWrite: 0.125, cacheRead: 0.01 },
  "claude-sonnet-5-5": { in: 2, out: 10, cacheWrite: 2.5, cacheRead: 0.1 },
  "claude-opus-5-5": { in: 4, out: 20, cacheWrite: 5, cacheRead: 0.2 },
  "claude-fable-5-1": { in: 10, out: 50, cacheWrite: 12.5, cacheRead: 0.25 },
};

// Haiku 5.5 costs more when a single prompt is over 100,000 tokens.
const HAIKU_LONG: Price = { in: 0.5, out: 2.5, cacheWrite: 0.625, cacheRead: 0.05 };

export function costUsd(model: string, u: Usage): number {
  let p = PRICES[model];
  if (!p) return 0; // unknown model: logged as zero rather than guessed
  if (model === "claude-haiku-5-5" && u.inputTokens + u.cacheReadTokens + u.cacheWriteTokens > 100_000) p = HAIKU_LONG;
  return (u.inputTokens * p.in + u.outputTokens * p.out + u.cacheWriteTokens * p.cacheWrite + u.cacheReadTokens * p.cacheRead) / 1e6;
}

// TinyFish Research is billed per completed run. Source: https://docs.tinyfish.ai/research-api/reference
export const TINYFISH_RUN_USD = { deep: 2, max: 3 } as const;
