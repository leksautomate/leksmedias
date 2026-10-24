"use client";

import { useId, useState } from "react";

const ENDPOINT = "https://leksmedias.com/api/v1/mcp";

const CLIENTS = [
  {
    id: "claude",
    label: "Claude Code",
    title: "Connect Claude Code in 1 terminal line",
    where: "Terminal / Bash / PowerShell",
    code: `claude mcp add --transport http leksmedia ${ENDPOINT} \\
  --header "Authorization: Bearer leks_live_YOUR_API_KEY"`,
  },
  {
    id: "codex",
    label: "Codex",
    title: "Connect Codex from the CLI or IDE",
    where: "Terminal, key read from an environment variable",
    code: `export LEKS_API_KEY=leks_live_YOUR_API_KEY
codex mcp add leksmedia --url ${ENDPOINT} \\
  --bearer-token-env-var LEKS_API_KEY`,
  },
  {
    id: "antigravity",
    label: "Antigravity",
    title: "Add leksmedia to Antigravity's MCP config",
    where: "mcp_config.json (use View raw config in the Agent panel)",
    code: `{
  "mcpServers": {
    "leksmedia": {
      "serverUrl": "${ENDPOINT}",
      "headers": { "Authorization": "Bearer leks_live_YOUR_API_KEY" }
    }
  }
}`,
  },
  {
    id: "hermes",
    label: "Hermes",
    title: "Add leksmedia to Hermes Agent",
    where: "~/.hermes/config.yaml",
    code: `mcp_servers:
  leksmedia:
    url: "${ENDPOINT}"
    headers:
      Authorization: "Bearer leks_live_YOUR_API_KEY"`,
  },
] as const;

export function AgentTabs() {
  const [id, setId] = useState<(typeof CLIENTS)[number]["id"]>("claude");
  const [copied, setCopied] = useState(false);
  const uid = useId();
  const c = CLIENTS.find((x) => x.id === id) ?? CLIENTS[0];

  async function copy() {
    try {
      await navigator.clipboard.writeText(c.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div role="tablist" aria-label="Agent clients" className="flex gap-2 overflow-x-auto border-b border-line bg-elevated p-3">
        {CLIENTS.map((x) => (
          <button
            key={x.id}
            role="tab"
            type="button"
            id={`${uid}-${x.id}`}
            aria-selected={id === x.id}
            aria-controls={`${uid}-panel`}
            onClick={() => setId(x.id)}
            className={`shrink-0 rounded-lg px-4 py-2 font-mono text-xs transition-colors ${
              id === x.id ? "bg-gold font-semibold text-bg" : "text-soft hover:bg-hover hover:text-white"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-${id}`} className="p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="font-serif text-2xl text-white sm:text-3xl">{c.title}</h3>
          <span className="rounded-full border border-good/30 bg-good/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-good">
            HTTP transport
          </span>
        </div>
        <div className="mt-6 overflow-hidden rounded-xl border border-line bg-bg">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5 font-mono text-[11px] text-mute">
            <span>{c.where}</span>
            <button
              type="button"
              onClick={copy}
              className="rounded-md border border-line px-2.5 py-1 text-soft transition-colors hover:border-line-strong hover:text-white"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-ink">
            <code>{c.code}</code>
          </pre>
        </div>
        <div className="mt-5 rounded-xl border border-line bg-elevated p-4 font-mono text-xs leading-relaxed">
          <p className="text-gold">EXAMPLE AGENT PROMPT:</p>
          <p className="mt-2 text-soft">
            &gt; &quot;Research the collapse of Blockbuster with deep research, write a 10,000 word script following the
            documentary rules, validate it, and save both versions.&quot;
          </p>
        </div>
      </div>
    </div>
  );
}
