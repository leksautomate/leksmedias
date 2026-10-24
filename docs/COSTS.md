# What a script costs to produce

Reproduce every number here with `python3 docs/cost-model.py` (add a word count as an argument).

## 1. Verified prices (checked 2026-10-24)

### Claude API
Source: [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing). USD per million tokens.

| Model | Input | Output | Cache write (5 min) | Cache read |
| --- | --- | --- | --- | --- |
| Haiku 5.5 (prompts up to 100k tokens) | $0.10 | $0.50 | $0.125 | $0.01 |
| Sonnet 5.5 | $2 | $10 | $2.50 | $0.10 |
| Opus 5.5 | $4 | $20 | $5 | $0.20 |
| Fable 5.1 | $10 | $50 | $12.50 | $0.25 |

Modifiers: Batch API is 50% off input and output (not combinable with fast mode); US-only inference is 1.1x; Claude 4.6+ models other than Haiku 5.5 include the full 1M context at standard price. Haiku 5.5 jumps to $0.50 / $2.50 when a prompt exceeds 100k tokens, so keep its prompts small.

### TinyFish
Source: [docs.tinyfish.ai Research API reference](https://docs.tinyfish.ai/research-api/reference.md) and [pricing page](https://www.tinyfish.ai/pricing).

| Product | Price | Limit |
| --- | --- | --- |
| **Research `deep`** | **$2 per completed run** | typically 5 to 20 min |
| **Research `max`** | **$3 per completed run** | typically 5 to 45 min |
| Research free allowance | first **2 completed runs per UTC day** free | per account, not per user |
| Research concurrency | **5 runs at once** by default | raise via support |
| Search | free | 30 req/min, 500 req/hour |
| Fetch | free | 150 URLs/min, **1,000 URLs/day** |
| Agent (browser automation) | $0.016 per step | 2 concurrent |

Failed, timed-out and cancelled runs are not charged. Research must be enabled on the account or the API returns 403.

## 2. The finding that shapes everything

**Claude tokens are cheap. A TinyFish deep run is not.** Research is billed per run, not per word, so it dominates the cost of any script that uses it.

Cost per finished script (from `cost-model.py`; token counts are assumptions, prices are verified):

### 10,000 words (about 67 min, 4 sections)

| Writer model | Standard research | Deep, lean (2 runs) | Deep, thorough (5 runs) |
| --- | --- | --- | --- |
| Haiku 5.5 | $0.20 | $5.11 | $11.11 |
| **Sonnet 5.5** | **$0.64** | **$5.54** | $11.54 |
| Opus 5.5 | $1.10 | $6.00 | $12.00 |
| Fable 5.1 | $2.45 | $7.36 | $13.36 |

### 25,000 words (about 2 hr 47 min, 10 sections)

| Writer model | Standard research | Deep, lean (4 runs) | Deep, thorough (11 runs) |
| --- | --- | --- | --- |
| Haiku 5.5 | $0.42 | $9.20 | $23.20 |
| **Sonnet 5.5** | **$1.38** | **$10.17** | $24.17 |
| Opus 5.5 | $2.39 | $11.18 | $25.18 |
| Fable 5.1 | $5.36 | $14.15 | $28.15 |

### A typical 1,800-word video

| Writer model | Standard research | Deep (1 run) |
| --- | --- | --- |
| Sonnet 5.5 | $0.25 | $2.18 |
| Opus 5.5 | $0.43 | $2.36 |

How to read it:

- With **standard research** (our own loop on TinyFish's free Search and Fetch), even a 25,000-word script costs **$1.38 on Sonnet 5.5 or $2.39 on Opus 5.5**. Writing is about 70% of that.
- With **deep research** the same script costs **$9 to $11** because of TinyFish. Claude is under 10% of it.
- "Lean" = one master run (`max` for long-form) plus one deep run per 3 sections. "Thorough" = a run for every section. Lean is the default; thorough is not worth offering until quality tests show it helps.
- Where the money goes at 10,000 words, Sonnet, standard research: section writing $0.35, outline $0.12, research synthesis $0.08, voice consistency check $0.07, everything else under $0.03.

### Choosing the writing model

| Step | Model | Why |
| --- | --- | --- |
| Reading fetched pages, ledger extraction, claim-to-source mapping, audit patches | **Haiku 5.5** | Cheap, structured, short prompts. Stay under the 100k-token tier |
| Outline, research synthesis, voice consistency check | **Sonnet 5.5** | Good reasoning at $2 / $10 |
| Hook and section writing | **Sonnet 5.5 default, Opus 5.5 for "Premium voice"** | Opus 5.5 is $4 / $20, so about 1.7x Sonnet on a script. Fable 5.1 is 5x Sonnet on input and output and is not worth it for prose unless blind tests show a gap |

Prompt caching matters: the 25k-token composed skill prefix is read from cache at $0.10 / MTok (Sonnet) instead of $2, which is what keeps long-form cheap.

## 3. Pricing built on these costs

- **1 credit = up to 2,500 words** (one section, about 17 min). Cost to us about $0.25 to $0.55 with standard research; the plan math uses a conservative **$0.40**.
- **Deep research is a separate quota** of TinyFish runs, because each costs $2 to $3 no matter how short the script is. The plan math uses **$2.30** blended.
- Yearly billing = **pay 10 months, get 12**. It is the simplest offer to explain and protects margin better than a flat 20% off.

| Plan | Price | Credits | Deep runs | Cost to serve at 100% use | Gross margin, monthly | Gross margin, yearly | Gross margin at 50% use |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Creator | $29 | 15 | 2 | $10.60 | 60% | 52% | 78% |
| Pro | $79 | 50 | 8 | $38.40 | 48% | 38% | 72% |
| Studio | $199 | 150 | 20 | $106.00 | 44% | 33% | 70% |

Margins are after card fees (2.9% + $0.30) and before support and hosting. Real usage is rarely 100%, so the 50% column is closer to what to expect. Studio on yearly billing is the thinnest cell: watch it.

Effective price per 1,000 words of finished, researched script: **$0.53 to $0.77 monthly**, $0.44 to $0.64 yearly. For comparison a human researcher-writer commonly charges many times that.

Add-ons: **10 credits for $25** ($2.50 each, cost about $0.40), **5 deep runs for $20** ($4 each, cost $2 to $3).

## 4. Capacity limits that will bite before money does

| Limit | Effect | Fix |
| --- | --- | --- |
| TinyFish Research: **5 concurrent runs** | A deep run takes 5 to 20 min, so about 15 to 60 runs per hour at best. A queue is mandatory | Queue with ETA shown to users; ask TinyFish support to raise before launch |
| TinyFish Fetch: **1,000 URLs/day** free | At 25 pages per 10k-word script, about 40 such scripts a day. At 12 pages per short script, about 83 | Cache fetched pages by URL; cap pages per run; negotiate a higher limit |
| TinyFish Search: 500 req/hour | About 20 to 40 scripts per hour | Same |
| Research free allowance: 2 runs/day per **account** | Covers about 60 runs a month, nothing at scale | Treat as a bonus; never plan margin around it |

Because TinyFish limits are per account, a **bring your own TinyFish key** option removes research cost and capacity from us entirely: each user gets their own 2 free deep runs a day and their own $8 starter wallet. See [`MCP.md`](MCP.md).

## 5. What is still an assumption

These must be replaced with measurements in the Phase 0 spike:

1. Tokens per step (the model uses 1.35 tokens per word, a 25k-token skill prefix, a 20% regeneration rate, 12 / 25 / 50 pages per short / 10k / 25k script).
2. Real length and quality of TinyFish reports, and the shape of the `citations` array (the docs only say it is an array of URLs).
3. Whether our own Search + Fetch loop matches deep research quality closely enough to be the default. If it does not, the default becomes deep and the plan quotas must shrink.
4. Agentic research loops usually take several planner turns; the model counts one. Add a safety factor of 1.5 on standard research until measured.
5. Cost of retries and failed runs (not charged by TinyFish, but Claude tokens already spent are).

**Decision rule:** if measured blended cost per credit exceeds **$0.75**, or per deep run exceeds **$3.00**, cut quotas before raising prices.
