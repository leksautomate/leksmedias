#!/usr/bin/env python3
"""
leksmedias cost model: what one finished script costs us to produce.

Run:  python3 docs/cost-model.py            (prints markdown tables)
      python3 docs/cost-model.py 15000      (add a custom word count)

PRICES are from the official pages, checked 2026-10-24:
  Claude:   https://platform.claude.com/docs/en/about-claude/pricing
  TinyFish: https://docs.tinyfish.ai/research-api/reference  (Research: deep $2/run, max $3/run,
            first 2 completed runs per UTC day free; Search + Fetch are free within rate limits)

EVERYTHING ELSE below (token counts, retry rate, pages per script) is an ASSUMPTION used to
size the plan. Replace with measured values after the Phase 0 spike (see docs/PLAN.md).
"""
import math
import sys

# ---- Claude prices, USD per million tokens (input, output, cache write 5m, cache read) ----
MODELS = {
    "Haiku 5.5":  dict(inp=0.10, out=0.50,  cw=0.125, cr=0.01),   # prompts up to 100k tokens
    "Sonnet 5.5": dict(inp=2.00, out=10.00, cw=2.50,  cr=0.10),
    "Opus 5.5":   dict(inp=4.00, out=20.00, cw=5.00,  cr=0.20),
    "Fable 5.1":  dict(inp=10.0, out=50.00, cw=12.50, cr=0.25),
}

# ---- TinyFish ----
DEEP, MAX = 2.00, 3.00          # USD per completed Research run
# Search and Fetch cost $0 but are rate limited: Fetch 150 URLs/min and 1,000 URLs/day.

# ---- Assumptions ----
TOK_PER_WORD = 1.35             # English prose
CUE_OVERHEAD = 1.30             # script A carries visual cues (+30% tokens)
ID_OVERHEAD = 1.08              # hidden fact ids per sentence (+8%)
SECTION_WORDS = 2500            # skill rule: never write more than ~3,000 words per generation
PREFIX_TOK = 25_000             # composed skill prompt (cached)
SECTION_UNCACHED_IN = 11_000    # outline + ledger slice + previous ending + brief
RETRY = 1.20                    # 20% of section calls are regenerated after audit
REPORT_TOK = 12_000             # one TinyFish report fed to ledger extraction
LEDGER_OUT_PER_RUN = 4_000
PAGE_TOK = 4_000                # one fetched page, for our own Search+Fetch research loop
PAGE_SUMMARY_OUT = 600


def usd(model, inp=0, out=0, cw=0, cr=0):
    m = MODELS[model]
    return (inp * m["inp"] + out * m["out"] + cw * m["cw"] + cr * m["cr"]) / 1e6


def llm_cost(words, writer, research):
    """Token cost of the whole pipeline. `research` is 'standard' (our Search+Fetch loop) or 'deep'."""
    sections = max(1, math.ceil(words / SECTION_WORDS))
    scriptA_tok = words * TOK_PER_WORD * CUE_OVERHEAD * ID_OVERHEAD
    sec_out = scriptA_tok / sections
    c = {}

    # 1) research digestion
    if research == "standard":
        pages = 12 if words <= 3000 else 25 if words <= 12000 else 50
        c["research loop (Haiku reads pages)"] = usd("Haiku 5.5", inp=pages * PAGE_TOK, out=pages * PAGE_SUMMARY_OUT)
        c["research synthesis (Sonnet)"] = usd("Sonnet 5.5", inp=pages * PAGE_SUMMARY_OUT + 6_000, out=4_000 * max(1, sections // 3))
    else:
        runs = deep_runs(words)["lean_runs"]
        c["ledger extraction (Haiku)"] = usd("Haiku 5.5", inp=runs * (REPORT_TOK + 2_000), out=runs * LEDGER_OUT_PER_RUN)

    ledger_tok = 6_000 * max(1, sections // 2)
    # 2) outline
    c["outline"] = usd(writer, inp=ledger_tok, cw=PREFIX_TOK, out=3_000)
    # 3) section writing (prefix is a cache read after the first call)
    calls = sections * RETRY
    c["section writing"] = usd(writer, inp=calls * SECTION_UNCACHED_IN, cr=calls * PREFIX_TOK, out=calls * sec_out)
    # 4) audit + sources mapping + voice check
    c["audit patches (Haiku)"] = usd("Haiku 5.5", inp=scriptA_tok + 4_000, out=scriptA_tok * 0.06)
    c["sources/claim map (Haiku)"] = usd("Haiku 5.5", inp=ledger_tok + 8_000, out=4_000)
    if sections > 1:
        c["voice consistency (Sonnet)"] = usd("Sonnet 5.5", inp=scriptA_tok, out=3_000)
    return c


def deep_runs(words):
    sections = max(1, math.ceil(words / SECTION_WORDS))
    lean = 1 + sections // 3 if sections > 1 else 1            # 1 master + 1 per 3 sections
    # Lean: master run is `max` when the script is long-form, the rest are `deep`.
    lean_cost = (MAX if sections > 1 else DEEP) + (lean - 1) * DEEP
    thorough = sections + (1 if sections > 1 else 0)            # master + one per section
    thorough_cost = (MAX if sections > 1 else DEEP) + (thorough - 1) * DEEP
    return dict(sections=sections, lean_runs=lean, lean_cost=lean_cost,
                thorough_runs=thorough, thorough_cost=thorough_cost)


def table(words_list):
    out = []
    for w in words_list:
        d = deep_runs(w)
        mins = w / 150
        out.append(f"\n### {w:,} words  (about {mins:.0f} min of narration, {d['sections']} section(s))\n")
        out.append("| Writer model | LLM, standard research | LLM + lean deep research | LLM + thorough deep research |")
        out.append("| --- | --- | --- | --- |")
        for writer in MODELS:
            std = sum(llm_cost(w, writer, "standard").values())
            dp = sum(llm_cost(w, writer, "deep").values())
            out.append(
                f"| {writer} | ${std:.2f} | ${dp + d['lean_cost']:.2f} ({d['lean_runs']} runs) "
                f"| ${dp + d['thorough_cost']:.2f} ({d['thorough_runs']} runs) |"
            )
    return "\n".join(out)


# ---- Plan ladder (credits). Run with: python3 docs/cost-model.py --plans ----
STANDARD_SCRIPT_CREDITS = 150      # 2,500 words
DEEP_RUN_CREDITS = 800             # one TinyFish Research run
COST_PER_CREDIT = 0.0028           # conservative: ~$0.42 per standard script, ~$2.24 per deep run
LADDER = [("Starter", 9.99, 1000), ("Creator", 24.99, 3500), ("Pro", 49.99, 9000), ("Studio", 149.99, 30000)]


def card_fee(price):
    return price * 0.029 + 0.30


def plan_table():
    rows = ["| Plan | Price | Credits | $ per 1,000 | Cost at 100% use | GM monthly | GM yearly (10 of 12) | GM at 50% use |",
            "| --- | --- | --- | --- | --- | --- | --- | --- |"]
    for name, price, credits in LADDER:
        cost = credits * COST_PER_CREDIT
        gm = lambda p, use=1.0: (p - card_fee(p) - cost * use) / p * 100
        yearly = price * 10 / 12
        rows.append(f"| {name} | ${price:.2f} | {credits:,} | ${price / credits * 1000:.2f} | ${cost:.2f} "
                    f"| {gm(price):.0f}% | {gm(yearly):.0f}% | {gm(price, 0.5):.0f}% |")
    return "\n".join(rows)


if __name__ == "__main__":
    if "--plans" in sys.argv:
        print(plan_table())
        sys.exit(0)
    sizes = [1800, 10_000, 25_000] + [int(a) for a in sys.argv[1:]]
    print(table(sizes))
    print("\n### Breakdown, 10,000 words, Sonnet 5.5 writer, standard research\n")
    for k, v in llm_cost(10_000, "Sonnet 5.5", "standard").items():
        print(f"- {k}: ${v:.3f}")
    print("\n### Breakdown, 25,000 words, Opus 5.5 writer, standard research\n")
    for k, v in llm_cost(25_000, "Opus 5.5", "standard").items():
        print(f"- {k}: ${v:.3f}")
    # Fetch capacity: free tier is 1,000 URLs/day
    for w, pages in [(1800, 12), (10_000, 25), (25_000, 50)]:
        print(f"\nFree Fetch cap (1,000 URLs/day) supports about {1000 // pages} scripts/day of {w:,} words at {pages} pages each")
