import { AnthropicProvider } from "./anthropic";
import { DemoLlm, DemoWeb } from "./demo";
import { TinyFishProvider } from "./tinyfish";
import type { LlmProvider, WebProvider } from "./types";

export type Providers = { llm: LlmProvider; web: WebProvider; demo: boolean };

/** True when either provider is the offline demo. Shown to users so placeholder text is never mistaken for real work. */
export function isDemoMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.LLM_PROVIDER ?? "demo") === "demo" || (env.RESEARCH_PROVIDER ?? "demo") === "demo";
}

export function makeProviders(env: NodeJS.ProcessEnv = process.env): Providers {
  const llmName = env.LLM_PROVIDER ?? "demo";
  const webName = env.RESEARCH_PROVIDER ?? "demo";

  let llm: LlmProvider;
  if (llmName === "anthropic") {
    if (!env.ANTHROPIC_API_KEY) throw new Error("LLM_PROVIDER=anthropic needs ANTHROPIC_API_KEY");
    llm = new AnthropicProvider({
      apiKey: env.ANTHROPIC_API_KEY,
      models: { writer: env.MODEL_WRITER ?? "claude-sonnet-5-5", fast: env.MODEL_FAST ?? "claude-haiku-5-5" },
    });
  } else if (llmName === "demo") {
    llm = new DemoLlm();
  } else {
    throw new Error(`Unknown LLM_PROVIDER "${llmName}" (use demo or anthropic)`);
  }

  let web: WebProvider;
  if (webName === "tinyfish") {
    if (!env.TINYFISH_API_KEY) throw new Error("RESEARCH_PROVIDER=tinyfish needs TINYFISH_API_KEY");
    web = new TinyFishProvider({ apiKey: env.TINYFISH_API_KEY });
  } else if (webName === "demo") {
    web = new DemoWeb();
  } else {
    throw new Error(`Unknown RESEARCH_PROVIDER "${webName}" (use demo or tinyfish)`);
  }

  if (env.NODE_ENV === "production" && (llmName === "demo" || webName === "demo")) {
    console.warn("WARNING: demo providers are active in production. Scripts will be placeholder text.");
  }
  return { llm, web, demo: llmName === "demo" || webName === "demo" };
}
