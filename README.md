# leksmedias

Researched faceless YouTube scripts. Type a topic, get a cited script in two versions:
one with visual cues for the editor, one clean for voiceover with a sources block.

The landing page, pricing page, legal pages and the **working app** (accounts, credits, research and script pipeline, worker). The docs:

| Doc | What it covers |
| --- | --- |
| [`DEPLOY.md`](docs/DEPLOY.md) | Run it on your own server with your own database |
| [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How the pieces fit and why a crash cannot lose work or money |
| [`PLAN.md`](docs/PLAN.md) | Product, flow, roadmap, risks |
| [`COSTS.md`](docs/COSTS.md) | Real Claude and TinyFish costs, 10,000 and 25,000-word scripts, margins |
| [`ADMIN.md`](docs/ADMIN.md) | Admin area plan |
| [`UX.md`](docs/UX.md) | User experience plan |
| [`MCP.md`](docs/MCP.md) | Use from Claude Code, Codex, Antigravity, Hermes and other agents |
| [`LEGAL.md`](docs/LEGAL.md) | Terms, Privacy and Refund pages: what to fill in and what to decide |
| [`COPY.md`](docs/COPY.md) | Copywriting notes: positioning, claims policy, how to earn real retention stats |

Re-run the cost model any time prices change: `python3 docs/cost-model.py`.

## Run it locally

You need Node 22 and a Postgres. The easiest Postgres is the one in this repo's compose file.

```bash
npm install
cp .env.example .env.local        # then set DATABASE_URL and APP_SECRET; keep the demo providers
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db   # Postgres on 127.0.0.1:5432
npm run db:migrate
npm run dev                       # the website, http://localhost:3000
npm run worker                    # in a second terminal: writes the scripts
```

With `LLM_PROVIDER=demo` and `RESEARCH_PROVIDER=demo` (the default) the whole product runs offline and writes clearly labelled placeholder text, so you can try every screen without API keys. Email confirmation links are printed in the terminal and shown on the signup page in development.

```bash
npm test                          # 124 tests, need a database called leks_test (see vitest.config.mts)
npm run typecheck
npm run grant -- you@example.com 1000 "note"   # add credits
npm run admin:promote -- you@example.com
```

Deploying on your own server: [`docs/DEPLOY.md`](docs/DEPLOY.md). How it works inside: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Where things live

| What | Where |
| --- | --- |
| Product name, tagline | `lib/site.ts` |
| Plans, credit rules, comparison table, pricing FAQ | `lib/pricing.ts` |
| Landing sample script | `lib/sample.ts` |
| Colors and type | `app/globals.css` (`@theme` tokens) |
| Early-access form handler | `app/api/waitlist/route.ts` |

## Early-access form

Sign-ups are saved in the Postgres `waitlist` table (duplicates are ignored). Set
`WAITLIST_WEBHOOK_URL` to also forward each sign-up (`{ email, source, at }`) to a Zapier, Make or
n8n webhook. In development without a database, sign-ups are logged to the console. In production,
if nothing could be saved, the form returns an error instead of silently dropping emails.
