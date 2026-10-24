# Product plan: researched faceless scripts

Working name: **ScriptForge** (one constant in `lib/site.ts`, rename freely).

## 1. What we are building

A web app where a creator types a topic and gets a fully researched faceless YouTube script.

Every run produces two outputs of the same video:

| Output | Audience | Contents |
| --- | --- | --- |
| **A. With visuals** | Video editor | Timestamped sections, `[B-ROLL:]`, `[IMAGE:]`, `[CLIP:]`, `[TEXT ON SCREEN:]`, `[MUSIC:]` cues, hook and re-hooks marked |
| **B. Clean + sources** | Voiceover / text-to-speech, fact-checking | Pure narration (no brackets, timestamps, speaker labels or URLs), then a separate **Sources and fact check** block: each claim mapped to a numbered source |

Sources stay out of the narration on purpose. A TTS voice reads URLs aloud ("h-t-t-p-colon..."), so citations live in their own block.

## 2. User flow

1. **Brief**: topic, format (documentary, listicle, exposé, true crime, video essay, explainer), length, niche, optional channel voice notes, optional own sources.
2. **Research** (minutes, streamed): live plan and progress, then a cited report.
3. **Fact ledger** (shown to the user, editable): the list of claims the script is allowed to use, each with source and confidence. Users can delete or add facts.
4. **Outline** (optional approve step, required for long-form).
5. **Script**: hook first, then sections.
6. **Audit**: automatic anti-AI-pattern pass, shows what was fixed.
7. **Result**: tabs for A and B, word count, estimated duration, export, regenerate a section.

## 3. Architecture

- **App**: Next.js (App Router) + TypeScript + Tailwind. Landing and pricing are static; the app is server-rendered behind auth.
- **Auth**: Clerk or Supabase Auth (decide at Phase 1).
- **DB**: Postgres (Neon or Supabase) with Drizzle. Tables: `users`, `projects`, `runs`, `facts`, `sources`, `scripts`, `credit_ledger`, `subscriptions`.
- **Jobs**: Inngest or Trigger.dev. Research takes minutes, so it cannot live in a request. Job emits progress events the UI subscribes to over SSE.
- **Billing**: Stripe subscriptions plus a **credit ledger** (append-only rows: grant, reserve, spend, refund). Reserve credits at run start, settle on success, refund on failure.
- **LLM**: Anthropic API. Static skill prompt first so it caches; research and brief after it. Route cheap steps (fact extraction, source mapping, lint) to a smaller model and keep the strongest model for hook and section writing.

### Research layer (TinyFish)

Verified from the TinyFish docs:

- **Research API**: `POST https://agent.tinyfish.ai/v1/automation/run-research`, body `{ query, mode: "deep" }`, header `X-API-Key`. Streams SSE: `created` (has `research_run_id`) → `plan_updated` → `final_result` (`result` + `citations`) → `done`. Runs usually take several minutes.
- **Search**: `GET https://api.search.tinyfish.ai`. Free, 30 req/min, 500 req/hour.
- **Fetch**: `POST https://api.fetch.tinyfish.ai`. Free, 150 URLs/min, 1,000 URLs/day.
- **Agent**: $0.016 per step, 2 concurrent runs by default (needed only if we later scrape logged-in or interactive sites).

Pipeline: `Research API (deep)` for the cited report, `Fetch` for any user-supplied URLs and to re-open key sources for exact quotes and dates, `Search` for gap filling. The citation field shape is not documented on the page I read, so Phase 0 must capture a real response and write the parser against it.

### Grounding rule (the product's main promise)

1. An LLM pass turns the research report into a **fact ledger**: `{id, claim, number/date, source_id, confidence}`.
2. The writer may only state facts present in the ledger. Writer output carries hidden fact ids per sentence.
3. A checker rejects any sentence with a number, date or proper noun that is not backed by a ledger id, and either removes it or flags it.
4. Output B's **Sources and fact check** block is generated from those ids, not written separately, so it cannot drift from the script.

Output B is derived from output A by a deterministic strip (remove cue lines, timestamps, brackets), followed by a lint. One script, two renderings, same facts.

## 4. Using the scriptwriting knowledge base (the zip)

The 16 markdown files are prompt knowledge. Do not load all of them each run (~200 KB). Compose per run:

| Always | By format | By niche / need |
| --- | --- | --- |
| master rules (hooks, structure, style, audit), variety rotation, hook swipe file, retention mechanics | script structures (+ hero's journey for biographies) | true crime, celebrity documentary, niche hooks, outro psychology, title formulas |

Rules that become code, not just prompt text:

- No em dashes anywhere (regex).
- Max 2 to 3 colons per script; flag setup phrases before colons.
- Flag "No X. No Y. No Z." fragments, "Most people..." openers, empty hype words, suspiciously specific percentages.
- Hook under 100 words with a "But / However" turn.
- Long-form: never more than about 3,000 words per generation. Write section by section, each call gets the full outline plus the previous section's last 2 to 3 sentences.
- Output B: zero brackets, zero timestamps, numbers written as words for TTS.

**License check before launch.** These files were sold as a product ("What You Just Bought"). Check the license for commercial or SaaS reuse and for redistribution, or get written permission, before shipping their content or their name. The repo does not contain the files, and the landing page never uses their brand. If permission is not available, the same rules can be rewritten as our own prompt modules.

## 5. Pricing

Credit-based, matching how cost actually scales (research plus tokens per minute of script).

- **1 credit = one finished script up to 12 minutes**, research and both outputs included. Each extra 12 minutes is one more credit (60 min = 5).
- Failed runs refund the credits.
- Yearly billing = 20% off, shown as the monthly equivalent with the yearly total underneath.

| Plan | Monthly | Yearly (per month) | Credits | $/credit (mo / yr) |
| --- | --- | --- | --- | --- |
| Free trial | $0 | $0 | 2 once | n/a |
| Creator | $29 | $23 | 15 | $1.93 / $1.53 |
| **Pro** (highlighted) | $79 | $63 | 50 | $1.58 / $1.26 |
| Studio | $199 | $159 | 150 | $1.33 / $1.06 |
| Top-up pack | $25 for 10 credits | | | $2.50 |

Why this shape:

- Three paid tiers with the middle one highlighted is the standard anchoring layout; Studio makes Pro look reasonable.
- Price per credit falls as tiers rise, and top-ups cost more than any plan credit, so nobody buys top-ups instead of upgrading.
- Long-form (over 24 minutes) and own-sources are gated to Pro because they cost the most to serve.
- Free trial gives 2 credits (one full script) so people see the real output before paying. It is a one-time grant to limit abuse; add email verification and a card-less abuse check.

### Margin sensitivity (assumption, must be measured)

Cost per credit (LLM tokens + research) is **not yet measured**. The TinyFish page I read does not list a Research price, and I did not look up current LLM prices. Gross margin if every credit is used, monthly / yearly billing:

| Plan | COGS $0.25/credit | COGS $0.50/credit | COGS $1.00/credit |
| --- | --- | --- | --- |
| Creator | 87% / 84% | 74% / 67% | 48% / 35% |
| Pro | 84% / 80% | 68% / 60% | 37% / 21% |
| Studio | 81% / 76% | 62% / 53% | 25% / 6% |

Target: **COGS at or under $0.50 per credit** (prompt caching of the static skill prefix, a smaller model for extraction and lint, strongest model only for writing). Typical subscription breakage (unused credits) adds margin on top. **Phase 0 measures real cost on 20 scripts; if blended COGS lands above about $0.75, cut Studio to 100 credits before touching prices.** Also measure 60-minute scripts: sectioned writing re-sends context, so cost may grow faster than 5x.

## 6. Roadmap

**Phase 0: spike (2 to 3 days).** One script end to end on a CLI: TinyFish Research → ledger → script A → derive B → audit. Record real response shapes, latency and cost per credit. Decide go/no-go on the margin table.

**Phase 1: MVP.**
Auth, brief form, streamed research progress, result page with two tabs, copy and TXT/MD export, credit ledger, Stripe checkout for the three plans, free trial.

**Phase 2: quality and retention.**
Editable fact ledger, own sources, section regenerate, channel voice profiles, long-form sectioned writing, DOCX export, hook variations (3 options before full script).

**Phase 3: later features (from your notes).**
Competitor transcript analysis, title and thumbnail ideas, fiction mode, team seats, batch queue, API.

## 7. Risks and open questions

| Risk | Mitigation |
| --- | --- |
| Skill content license | Get permission or rewrite the rules as our own modules (section 4) |
| TinyFish Research cost and limits unknown, free Fetch capped at 1,000 URLs/day | Measure in Phase 0, cap URLs fetched per run, ask TinyFish about volume pricing early |
| Hallucinated facts | Grounding rule, checker, visible ledger, "verify before publishing" copy |
| Quoting copyrighted source text | Store short excerpts and links only, paraphrase in scripts |
| Free-trial abuse | Email verification, one grant per account, rate limits |
| Research takes minutes | Background jobs, progress stream, email or push when done |
| Topics with no public footage or facts | Pre-flight "enough sources?" check before spending credits |
| Defamation risk on real people (true crime, exposé) | Flag allegations as allegations in the ledger, require a source for every claim about a living person |

Open questions for you:

1. Product name and domain (the landing page uses ScriptForge as a placeholder).
2. The "sample" output you mentioned: I did not receive a file, so the landing sample is a short original Blockbuster vs Netflix script. Send the real sample and I will match its layout.
3. Which voice-tool formats matter most for output B (plain TTS, or a specific video tool's import format)?
4. Refund policy (a 7-day money-back guarantee is common for subscriptions and lifts conversion).
