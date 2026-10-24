# leksmedias: product plan

Researched faceless YouTube scripts. Type a topic, get a cited script.

| Doc | What it covers |
| --- | --- |
| **This file** | Product, flow, architecture, pricing summary, roadmap, risks |
| [`COSTS.md`](COSTS.md) | Verified Claude and TinyFish prices, cost of 10,000 and 25,000-word scripts, margins, capacity limits |
| [`ADMIN.md`](ADMIN.md) | Admin area: roles, screens, cost and margin, capacity, security, phases |
| [`UX.md`](UX.md) | User journey, onboarding, progress, result page, accessibility, metrics |
| [`MCP.md`](MCP.md) | Using leksmedias from Claude Code, Codex, Antigravity, Hermes and other MCP agents |
| [`cost-model.py`](cost-model.py) | Reproducible cost model. `python3 docs/cost-model.py` |

## 1. What we are building

A web app where a creator types a topic and gets a fully researched faceless YouTube script, from a 1,800-word video up to a 25,000 to 30,000 word documentary.

Every run produces two outputs of the same video:

| Output | Audience | Contents |
| --- | --- | --- |
| **A. With visuals** | Video editor | Timestamped sections, `[B-ROLL:]`, `[IMAGE:]`, `[CLIP:]`, `[TEXT ON SCREEN:]`, `[MUSIC:]` cues, hook and re-hooks marked |
| **B. Clean + sources** | Voiceover / text-to-speech, fact-checking | Pure narration (no brackets, timestamps, speaker labels or URLs), then a separate **Sources and fact check** block: each claim mapped to a numbered source |

Sources stay out of the narration on purpose. A TTS voice reads URLs aloud, so citations live in their own block.

Three ways to use it (details in [`MCP.md`](MCP.md)): the website, your own AI agent over MCP, or your agent plus your own TinyFish account.

## 2. User flow

1. **Brief**: topic, format (documentary, listicle, exposé, true crime, video essay, explainer), length in words, niche, research depth (standard or deep), optional voice notes and own sources. A live cost line shows credits and deep runs before anything is spent.
2. **Research** (minutes, streamed): real events from TinyFish shown as they happen.
3. **Fact ledger** (shown, editable): the claims the script may use, each with source and confidence.
4. **Outline** (optional approve step, shown by default above 5,000 words).
5. **Script**: hook first, then sections of about 2,500 words.
6. **Audit**: automatic anti-AI-pattern pass, shows what was fixed.
7. **Result**: tabs for A and B, word count, duration, export, regenerate a section.

Full UX detail: [`UX.md`](UX.md).

## 3. Architecture

- **App**: Next.js (App Router) + TypeScript + Tailwind. Landing and pricing are static; the app is server-rendered behind auth.
- **Auth**: Clerk or Supabase Auth (decide at Phase 1). Email verification gates free credits.
- **DB**: Postgres (Neon or Supabase) with Drizzle. Core tables: `users`, `projects`, `runs`, `facts`, `sources`, `scripts`, `credit_ledger`, `subscriptions`, `api_keys`. Admin tables in [`ADMIN.md`](ADMIN.md).
- **Jobs**: Inngest or Trigger.dev. Research takes 5 to 20 minutes, so it cannot live in a request. Jobs emit progress events the UI follows over SSE.
- **Billing**: Stripe subscriptions plus an **append-only credit ledger** (grant, reserve, spend, refund) in whole credits, with deep research priced in the same credits. Reserve at run start, settle on success, refund on failure.
- **LLM**: Anthropic API. The static skill prefix goes first so it caches (cache reads cost 5% of input on Sonnet 5.5). Haiku 5.5 for reading pages, extraction, mapping and lint; Sonnet 5.5 for outline, synthesis and default writing; Opus 5.5 as an optional "premium voice". See [`COSTS.md`](COSTS.md).
- **MCP**: remote Streamable HTTP server in the same app at `/mcp`. See [`MCP.md`](MCP.md).

### Research layer (TinyFish), verified against the docs

| API | Endpoint | Notes |
| --- | --- | --- |
| **Research** | `POST https://agent.tinyfish.ai/v1/automation/run-research` (SSE) or `run-research-async` | Header `X-API-Key`. `mode`: `deep` (5 to 20 min) or `max` (5 to 45 min). Also `output_language`, `domain_type` (`web`, `news`, `research_paper`), date filters, `domain_filter`, `prior_run_id` and `session_id` to continue a run. Report in `deep_result.result`, `citations` is an array of URLs. **$2 per deep run, $3 per max run**, first 2 runs per UTC day free, **5 concurrent**, 45-minute budget. Events kept 1 hour, so we persist them |
| **Search** | `GET https://api.search.tinyfish.ai` | Free, 30 req/min, 500/hour |
| **Fetch** | `POST https://api.fetch.tinyfish.ai` | Free, 150 URLs/min, **1,000 URLs/day** |
| **Agent** | `https://agent.tinyfish.ai/v1/automation/...` | $0.016 per step. Only needed for interactive sites |

**Two research depths**
- **Standard**: our own loop on Search + Fetch (Haiku reads the pages, Sonnet synthesises). Costs tokens only. Default.
- **Deep**: TinyFish Research run(s). Number of runs scales with length (lean policy: 1 for up to 5,000 words, 2 for 10,000, 4 for 25,000, 5 for 30,000).

The Research `citations` shape is not documented beyond "array of URLs", and the retrieval endpoint also returns `research_plan` and `evidence` (sources and the claims they support), which is exactly what the fact ledger needs. Phase 0 must capture real responses and write the parser against them.

### Grounding rule (the product's main promise)

1. An LLM pass turns research output into a **fact ledger**: `{id, claim, number/date, source_id, confidence}`.
2. The writer may only state facts present in the ledger and tags each sentence with fact ids (hidden from users).
3. A checker rejects any sentence with a number, date or proper noun not backed by a ledger id; it is removed or flagged.
4. Output B's **Sources and fact check** block is generated from those ids, not written separately, so it cannot drift from the script.

Output B is derived from output A by a deterministic strip (remove cue lines, timestamps, brackets), then a lint. One script, two renderings, same facts.

### Long scripts (10,000 and 25,000 words)

The rulebook says never to write more than about 3,000 words per generation. So: one master research pass, an **approved outline**, then sections of about 2,500 words written in order, each given the full outline plus the previous section's last 2 to 3 sentences. After the last section a voice-consistency pass flags drift. A 25,000-word script is 10 sections.

## 4. Using the scriptwriting rulebook (the zip)

The 16 markdown files are prompt knowledge (~200 KB). Do not load all of them each run. Compose per run:

| Always | By format | By niche / need |
| --- | --- | --- |
| master rules (hooks, structure, style, audit), variety rotation, hook swipe file, retention mechanics | script structures (+ hero's journey for biographies) | true crime, celebrity documentary, niche hooks, outro psychology, title formulas |

Rules that become code, not just prompt text:

- No em dashes anywhere (regex).
- Max 2 to 3 colons per script; flag setup phrases before colons.
- Flag "No X. No Y. No Z." fragments, "Most people..." openers, empty hype words, suspiciously specific percentages.
- Hook under 100 words with a "But / However" turn.
- Output B: zero brackets, zero timestamps, zero URLs, numbers written as words for TTS.

**License check before launch.** These files were sold as a product. Check the license for commercial or SaaS use, and for handing the rules to third-party agents through MCP, or get written permission, before shipping their content or their name. The repo does not contain the files and the site never uses their brand. If permission is not available, rewrite the rules as our own prompt modules.

## 5. Pricing summary

Full reasoning and margin tables in [`COSTS.md`](COSTS.md). The landing and pricing pages already show this.

- **One balance: credits.** A script costs credits by length: **100** (1,200 words), **150** (2,500), **300** (5,000), **500** (8,000), **600** (10,000), **1,500** (25,000), **1,800** (30,000). Standard research and both versions are included.
- **Deep research costs 800 credits per TinyFish run** (a run costs us $2 to $3). Longer scripts use more runs: 1 up to 5,000 words, 2 for 10,000, 4 for 25,000, 5 for 30,000. So a 10,000-word deep script is 600 + 1,600 = 2,200 credits.
- Deep research is available from the Creator plan; Starter and the free trial use standard research.
- Credits are sized so every credit costs us about the same (about $0.0028 conservatively), whatever it is spent on. That keeps margins predictable and lets us show big, friendly numbers.
- Yearly = **pay 10 months, get 12**.

| Plan | Monthly | Yearly (per month) | Credits | $ per 1,000 credits | About (standard scripts) | Longest script |
| --- | --- | --- | --- | --- | --- | --- |
| Free trial | $0 | | 300 once | n/a | 2 | 2,500 words |
| **Starter** | $9.99 | $8.33 ($99.90/yr) | 1,000 | $9.99 | 6 | 2,500 words |
| Creator | $24.99 | $20.83 ($249.90/yr) | 3,500 | $7.14 | 23 | 5,000 words |
| **Pro** | $49.99 | $41.66 ($499.90/yr) | 9,000 | $5.55 | 60 | 12,500 words |
| Studio | $149.99 | $124.99 ($1,499.90/yr) | 30,000 | $5.00 | 200 | 30,000 words |
| Top-up | 2,000 credits for $25 ($12.50 per 1,000) | | | | | |

Estimated gross margin at full use (monthly / yearly): Starter 66% / 60%, Creator 57% / 49%, Pro 46% / 36%, Studio 41% / 30%; about 70% to 80% at half use. Why Pro is 9,000 and not 15,000: at 15,000 credits the Pro margin at full use falls to 12%.

**Decision rule:** if measured cost per credit exceeds $0.0040 (about $0.60 per standard script) or a deep run costs more than $3.00, cut credit allowances before raising prices.

## 6. Roadmap

**Phase 0: spike (2 to 3 days).** One 10,000-word script end to end on a CLI: TinyFish Research and Search/Fetch loop → ledger → script A → derive B → audit. Record real response shapes, latency, tokens and cost per credit and per deep run. Compare standard vs deep research quality. Go/no-go on the margin table.

**Phase 1: MVP.** Auth, brief with live cost line, streamed research progress, result page with two tabs, copy and TXT/MD export, credit ledger, Stripe for the three plans, free trial, TinyFish queue (5 concurrent), **admin launch minimum** ([`ADMIN.md`](ADMIN.md) phase 1).

**Phase 2: quality and agents.** Editable fact ledger, own sources, section regenerate, voice profiles, long-form sectioned writing, DOCX export, hook alternatives. **MCP phase A and B** ([`MCP.md`](MCP.md)): rules, validation and research tools over API keys. Admin cost and margin, alerts, promo codes.

**Phase 3: scale.** MCP OAuth and Integrations page, packaged plugins for each agent, bring-your-own TinyFish key, pricing and prompt editors in admin, A/B on prompts and models.

**Phase 4: later features (from your notes).** Competitor transcript analysis, title and thumbnail ideas, fiction mode, team seats, batch queue, public API.

## 7. Risks and open questions

| Risk | Mitigation |
| --- | --- |
| Rulebook license | Get permission or rewrite as our own modules (section 4) |
| TinyFish capacity: 5 concurrent research runs, 1,000 Fetch URLs a day | Queue with ETA, page cache, page caps, ask TinyFish to raise limits before launch, bring-your-own-key tier |
| TinyFish Research must be enabled on the account (403 otherwise) and is billed from a wallet | Enable and fund before Phase 0; wallet-low alert |
| Hallucinated facts | Grounding rule, checker, visible ledger, "verify before publishing" copy |
| Quoting copyrighted source text | Store short excerpts and links only; paraphrase in scripts |
| Free-trial abuse | Email verification, one grant per account and device, rate limits |
| Runaway agent spend over MCP | Per-key caps, scopes, idempotency keys, estimates before spend |
| Defamation risk on real people (true crime, exposé) | Flag allegations as allegations in the ledger; require a source for every claim about a living person |
| Cost assumptions are not yet measured | Phase 0 measurement, decision rule in section 5 |

Open questions for you:

1. The "sample" output you mentioned did not arrive as a file, so the landing sample is a short original Blockbuster vs Netflix script. Send the real sample and I will match its layout.
2. Domain name (needed for real MCP setup commands and the canonical URL).
3. Is agent mode (MCP) on every paid plan or Pro and up?
4. Who else will use the admin, and do you want Support and Finance roles at launch?
5. Refund policy (a 7-day money-back guarantee is common and lifts conversion).
