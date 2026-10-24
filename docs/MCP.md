# Bring your own agent: MCP plan

Goal: let people use leksmedias from the AI agent they already work in (Claude Code, Codex, Antigravity, Hermes, or any other client that speaks MCP) instead of only through our website.

## 1. Why this is worth building

- **Power users live in agents.** Many creators and agencies already pay for an agent subscription. Meeting them there is distribution.
- **It lowers our cost.** In agent mode the user's own agent does the writing, so we do not pay Claude tokens for it. We only pay for research. See [`COSTS.md`](COSTS.md): writing is the largest Claude cost.
- **It makes the product stickier.** Our research, rules and checks become tools in a workflow, not a page to visit.
- **It scales our TinyFish limits.** A user can bring their own TinyFish account, which brings their own 2 free deep runs a day, their own $8 starter wallet and their own concurrency.

## 2. Three ways to use leksmedias

| Mode | Who writes | Who researches | Who pays what |
| --- | --- | --- | --- |
| **Full service** (the website) | our Claude calls | our TinyFish | credits cover everything |
| **Agent mode** (MCP) | the user's agent, on their subscription | our TinyFish | credits cover research and checks only, at a lower rate |
| **Bring your own research key** | the user's agent | the user's own TinyFish account (their MCP) | the user pays TinyFish directly; leksmedias provides only rules and checks, nearly free |

All three share the same fact ledger and the same audit, so the output quality bar is the same whichever mode produced it.

## 3. How an agent session works

```
1  start_research({ topic, format, words, depth })      → run_id, cost estimate
2  get_research({ run_id })  (poll or follow progress)  → fact ledger with ids and sources
3  get_writing_rules({ format, niche, mode })           → hook patterns, structure, style rules
4  agent writes section by section, using only ledger facts, tagging fact ids
5  validate_script({ text, mode, run_id })              → lint report, fix list
6  agent fixes and re-validates until clean
7  build_sources_block({ run_id, text })                → "Sources and fact check" block
8  save_script({ run_id, visual, clean })               → saved to the user's library on the site
```

Step 4 is where the user's own model and subscription do the work. Steps 1, 2, 3, 5, 7 are ours.

## 4. The server

- **One remote MCP server** inside the Next.js app at `/mcp`, **Streamable HTTP** transport. It reuses the same services as the website, so there is no second backend to maintain.
- **Stateless request handling**, with run state in Postgres. Long work is a job; tools return immediately.
- Optional later: a tiny `npx` stdio wrapper for clients that only support local servers. Not needed for the four clients below.

### Authentication

| Phase | Method | Works in |
| --- | --- | --- |
| 1 | **API key as a bearer token** (`lk_live_...`, created in Settings, shown once, stored hashed) | Claude Code, Codex, Antigravity, Hermes |
| 2 | **OAuth 2.1** per the MCP authorization spec, so users click "connect" and approve in the browser | Claude Code and Codex support an OAuth sign-in flow; others stay on keys |

Keys have: a name, **scopes** (`research`, `rules`, `validate`, `library`, `billing:read`), an optional **monthly credit cap**, rate limits, last-used time, and instant revoke. A runaway agent loop must not be able to empty someone's balance, so a key with no cap defaults to 20% of the plan's monthly credits.

## 5. Tools

Names are stable and verb-first. All return structured JSON plus a short text summary. All are read-only unless stated.

| Tool | Input | Output | Cost |
| --- | --- | --- | --- |
| `start_research` | `topic`, `format`, `words`, `depth` (`standard`/`deep`), `sources[]?`, `idempotency_key` | `run_id`, `estimated_cost`, `eta` | credits: ½ per 2,500 words (standard); deep uses 1 deep run per TinyFish run |
| `get_research` | `run_id`, `cursor?` | `status`, `stage`, progress events, and when done the **fact ledger** (`id`, `claim`, `source_id`, `confidence`) and `sources[]` | free |
| `add_sources` | `run_id`, `urls[]` | updated ledger | uses Fetch, free within limits |
| `get_writing_rules` | `format`, `niche?`, `mode` (`visual`/`clean`), `section?` | rules text: hook pattern, structure, transitions, style, banned patterns | free |
| `validate_script` | `text`, `mode`, `run_id?` | issues with line, rule and suggested fix; claims missing a fact id; score | free, fair-use 500/day |
| `build_sources_block` | `run_id`, `text` | formatted fact-check block and numbered sources | free |
| `save_script` *(writes)* | `run_id`, `visual?`, `clean?`, `title` | library URL | free |
| `get_credits` | none | balances, renewal date | free |
| `list_runs` | `limit`, `cursor` | recent runs | free |
| `write_script` *(optional, writes)* | `run_id`, options | job id; **we** write with our Claude | full-service credits |

### Prompts and resources
- **MCP prompts**: `/leksmedias-write-script` (the whole workflow in section 3 as instructions), `/leksmedias-audit` (run the checks on pasted text). In clients with slash commands they show up as commands.
- **Resources**: `leksmedias://rules/{format}`, `leksmedias://runs/{id}/ledger`, `leksmedias://runs/{id}/script/{visual|clean}` so large outputs are fetched in pieces instead of one giant tool result.

### Tool design rules
- **Start then poll.** TinyFish deep research runs 5 to 20 minutes, so `start_research` never blocks. `get_research` returns progress and a `retry_after` hint. Our server reconnects to TinyFish's event stream using `Last-Event-ID`, and TinyFish retains events for 1 hour, so persist them ourselves.
- **Idempotency keys** on every tool that spends money. TinyFish's async start is not idempotent, so a retried request can double-charge unless we guard it.
- **Cost before spend.** `start_research` fails with a clear message if the estimate exceeds the key's remaining cap, and returns the estimate in the success result.
- **Small outputs.** Scripts up to 30,000 words are served section by section via resources, never as one 40,000-token result.
- **Errors are instructions.** Each error says what happened, whether credits were refunded, and the next call to make.

## 6. Client setup (target experience)

The user creates a key in **Settings → Integrations** and the page shows these with their key filled in. The syntax comes from each client's current docs; confirm the exact flags against the installed version when building, because these tools move quickly. `<host>` is the production domain.

**Claude Code**
```bash
claude mcp add --transport http leksmedias https://<host>/mcp \
  --header "Authorization: Bearer $LEKS_API_KEY"
```
(Add `--scope user` to make it available in every project. OAuth sign-in replaces the header in phase 2.)

**Codex (CLI and IDE share `~/.codex/config.toml`)**
```bash
export LEKS_API_KEY=lk_live_...
codex mcp add leksmedias --url https://<host>/mcp --bearer-token-env-var LEKS_API_KEY
```
or in `config.toml`:
```toml
[mcp_servers.leksmedias]
url = "https://<host>/mcp"
bearer_token_env_var = "LEKS_API_KEY"
```

**Antigravity** (remote servers use `serverUrl`, not `url`; the Agent panel's MCP Servers settings has "View raw config", which shows the file path your install actually uses, since docs and guides disagree between `~/.gemini/config/mcp_config.json` and `~/.gemini/antigravity/mcp_config.json`)
```json
{
  "mcpServers": {
    "leksmedias": {
      "serverUrl": "https://<host>/mcp",
      "headers": { "Authorization": "Bearer lk_live_..." }
    }
  }
}
```

**Hermes Agent** (`~/.hermes/config.yaml`)
```yaml
mcp_servers:
  leksmedias:
    url: "https://<host>/mcp"
    headers:
      Authorization: "Bearer lk_live_..."
```

**Any other MCP client**: the endpoint is a standard Streamable HTTP MCP server with a bearer token.

### Bring your own research key
Add TinyFish's own MCP server next to ours so research runs on the user's TinyFish account:
```bash
claude mcp add --transport http tinyfish https://agent.tinyfish.ai/mcp      # OAuth sign-in
codex mcp add tinyfish --url https://agent.tinyfish.ai/mcp
```
TinyFish's server exposes `search`, `fetch_content` and `start_deep_research` / `get_deep_research`. leksmedias then provides only `get_writing_rules`, `validate_script` and `build_sources_block`, with the ledger built from TinyFish's output by passing it to `build_sources_block`. This tier costs us almost nothing and can be offered on every paid plan.

## 7. Billing in agent mode

| Action | Charge |
| --- | --- |
| Standard research + ledger | **½ credit per 2,500 words** of planned script (our cost is roughly a tenth of a full-service credit, so margin stays high) |
| Deep research | **1 deep run per TinyFish run**, same as the website |
| Rules, validation, sources block, save | free (fair use) |
| `write_script` (we write) | same as the website |

Credits and deep runs are one shared balance with the website. Every tool call that spends writes a ledger row tagged with the key id, so the user sees "Claude Code key: 3.5 credits this month" and the admin sees it in cost reports. Half credits mean the ledger stores credits in tenths.

## 8. Security and abuse

- **Keys**: random 32 bytes, shown once, stored as a hash, prefix visible for identification, revocable, with last-used IP and time.
- **Scopes and caps** per key, plus account-level daily spend limits.
- **Prompt injection**: research content comes from the open web. Return it wrapped and labelled as untrusted source text, never as instructions, and keep tool results free of anything an attacker could use to steer the agent into spending credits.
- **Confirmation for spend** is the agent client's job, but we help: tools that spend say so in their description, and estimates come first.
- **Rate limits** per key and per IP. Per-plan concurrency (Creator 1 run, Pro 2, Studio 5) to protect TinyFish's 5-run limit.
- **Data**: no script text in logs. Agent calls are logged with sizes and ids, not content.
- **Rules redistribution**: `get_writing_rules` hands our prompt modules to third-party agents. Check the license position on the source rulebook (see [`PLAN.md`](PLAN.md) section 4) before exposing it, and expose composed, minimal rules per call rather than the full files.

## 9. Testing and rollout

Test matrix: the four clients above × (key auth, large output, long-running poll, tool error, revoked key). Each client gets a scripted end-to-end run that produces a script and validates it.

| Phase | Scope |
| --- | --- |
| A | MCP server with key auth; tools `get_writing_rules`, `validate_script`, `build_sources_block`. No spend, so it is safe to ship early and test with Claude Code |
| B | `start_research`, `get_research`, caps, idempotency, ledger rows; Codex, Antigravity, Hermes verified |
| C | OAuth 2.1; Integrations page with copy-paste config and live call log |
| D | Packaged helpers: a Claude Code plugin with the workflow as a slash command, an `AGENTS.md` snippet for Codex, a rules file for Hermes and Antigravity |

## 10. Open questions

1. Should agent mode be on every paid plan or Pro and up? (Plan page currently says all paid plans, marked Soon.)
2. Is ½ credit per 2,500 words the right agent-mode rate, or should research be a flat 1 credit?
3. Do we want to publish the MCP server for third-party directories once it is stable?
4. Domain name for the production host, needed to print real setup commands.
