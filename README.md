# leksmedias

Researched faceless YouTube scripts. Type a topic, get a cited script in two versions:
one with visual cues for the editor, one clean for voiceover with a sources block.

This repo currently contains the **landing page** and **pricing page**. The plans are in `docs/`:

| Doc | What it covers |
| --- | --- |
| [`PLAN.md`](docs/PLAN.md) | Product, flow, architecture, roadmap, risks |
| [`COSTS.md`](docs/COSTS.md) | Real Claude and TinyFish costs, 10,000 and 25,000-word scripts, margins |
| [`ADMIN.md`](docs/ADMIN.md) | Admin area plan |
| [`UX.md`](docs/UX.md) | User experience plan |
| [`MCP.md`](docs/MCP.md) | Use from Claude Code, Codex, Antigravity, Hermes and other agents |

Re-run the cost model any time prices change: `python3 docs/cost-model.py`.

## Run it

```bash
npm install
cp .env.example .env.local   # optional
npm run dev                  # http://localhost:3000
npm run build && npm start   # production
npm run typecheck
```

## Where things live

| What | Where |
| --- | --- |
| Product name, tagline | `lib/site.ts` |
| Plans, credit rules, comparison table, pricing FAQ | `lib/pricing.ts` |
| Landing sample script | `lib/sample.ts` |
| Colors and type | `app/globals.css` (`@theme` tokens) |
| Early-access form handler | `app/api/waitlist/route.ts` |

## Early-access form

Set `WAITLIST_WEBHOOK_URL` to any endpoint that accepts a JSON POST (`{ email, source, at }`),
for example a Zapier, Make or n8n webhook. In development, with the variable unset, sign-ups are
logged to the console. In production, with the variable unset, the form returns an error instead
of silently dropping emails.
