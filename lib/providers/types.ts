export type Usage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

/** "writer" is the strong model for prose, "fast" the cheap one for extraction and planning. */
export type ModelRole = "writer" | "fast";

export type LlmRequest = {
  /** For cost logs: queries, facts, outline, section, ... */
  step: string;
  model: ModelRole;
  system: string;
  /** Ask the provider to cache the system prompt (it is identical across sections of one script). */
  cacheSystem?: boolean;
  user: string;
  maxTokens: number;
};

export type LlmResult = {
  text: string;
  model: string;
  usage: Usage;
  costUsd: number;
  ms: number;
  /** "max_tokens" means the answer was cut off. */
  stopReason: string | null;
};

export interface LlmProvider {
  readonly name: string;
  complete(req: LlmRequest, signal?: AbortSignal): Promise<LlmResult>;
}

export type SearchHit = { url: string; title: string; snippet: string; siteName?: string };
export type FetchedPage = { url: string; title: string | null; text: string; publishedDate?: string | null };

export type DeepResearchOptions = {
  mode: "deep" | "max";
  language: string;
  /** If we already started this research run before a restart, keep waiting for it instead of paying twice. */
  resumeId?: string | null;
  onStarted?: (externalId: string) => Promise<void> | void;
  onProgress?: (message: string) => Promise<void> | void;
  signal?: AbortSignal;
};

export type DeepResearchResult = {
  externalId: string;
  report: string;
  citations: string[];
  costUsd: number;
};

/** The web: search, read pages, or hand a whole question to a research agent. */
export interface WebProvider {
  readonly name: string;
  search(query: string, opts?: { purpose?: string; language?: string; signal?: AbortSignal }): Promise<SearchHit[]>;
  fetchPages(urls: string[], signal?: AbortSignal): Promise<{ pages: FetchedPage[]; failed: { url: string; error: string }[] }>;
  deepResearch(query: string, opts: DeepResearchOptions): Promise<DeepResearchResult>;
}

/** An error that retrying will not fix (bad key, no research access, out of provider credit). */
export class PermanentProviderError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "PermanentProviderError";
  }
}

export class TransientProviderError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "TransientProviderError";
  }
}
