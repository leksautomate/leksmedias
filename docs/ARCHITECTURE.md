# How it fits together

```
 Browser ──HTTPS──► Caddy ──► web (Next.js) ──► Postgres  ◄── worker ──► Anthropic (writing)
                                  │                              └────► TinyFish (search, pages, deep research)
                                  └── reads/writes: users, sessions, credits, runs, scripts
```

Three long-running processes share one Postgres database, and nothing else:

- **web**: pages, sign-in, the brief form, the run page, JSON status and download endpoints. It never calls Anthropic or TinyFish.
- **worker**: picks up queued scripts and does all the slow work. A 45-minute research run never ties up a web request, and restarting the website never interrupts a script.
- **db**: Postgres 16. It is also the job queue (no Redis, nothing else to run).

## A script's life

1. **Create** (`lib/pipeline/create.ts`). Validate the brief, check the plan's limits, then in **one transaction** charge the credits and insert the run. Either both happen or neither.
2. **Queue** (`lib/pipeline/queue.ts`). The worker claims the oldest ready run with `FOR UPDATE SKIP LOCKED`, so two workers never take the same one. At most 2 deep-research scripts run at once to stay inside TinyFish's concurrency limit.
3. **Stages** (`lib/pipeline/run.ts`). Each stage saves its result before the next starts, and skips itself if its result is already saved:

| Stage | What happens | Saved to |
| --- | --- | --- |
| research | Standard: 4 to 6 searches, then read 12 to 50 pages. Deep: 1 to 5 TinyFish research runs (up to 3 in parallel) | `sources`, `runs.research_report`, `provider_events` |
| facts | The cheap model turns the notes into a numbered fact list, each tied to source numbers. Facts citing a source that does not exist are dropped. Too few facts stops the run | `facts` |
| outline | The writing model plans one section per 2,500 words and assigns facts to sections | `runs.outline`, `run_sections` |
| writing | One section at a time, each given the outline, its facts and the previous section's last sentences. A draft with banned patterns is rewritten once | `run_sections.raw` |
| audit | Parse, fix dashes, build both versions and the sources report, lint, store | `scripts` (visual, clean, sources) |

4. **Finish or fail** (`runOnce`). Success completes the run. A cancel refunds (keeping credits for deep research already paid for). A permanent problem fails the run and refunds in full. A temporary problem retries up to 3 times with a growing delay, then fails and refunds.

## Why a crash cannot lose work or money

- Each stage's output is in the database before the next stage begins, so a restarted worker continues from the last finished stage.
- A deep research run's TinyFish id is saved the moment it starts. After a restart the worker keeps waiting for that run instead of paying for a second one.
- Runs send a heartbeat every 20 seconds. If a worker dies, other workers requeue its runs after 2 minutes.
- On a clean shutdown the worker hands its runs back immediately without counting an attempt.

## Credits (`lib/core/ledger.ts`)

- `credit_ledger` is append-only: every change is a row with the amount and the balance after.
- `users.credit_balance` is kept in step in the same transaction and has a `CHECK (credit_balance >= 0)`, so even a bug cannot make it negative.
- Every change locks the user's row first (`SELECT ... FOR UPDATE`) so changes happen one at a time.
- Grants and refunds take an idempotency key, so retrying never doubles them.
- Tests fire 12 parallel spends at one balance (exactly the affordable number succeed) and parallel retries of one grant. Run creation charges **before** inserting the run: the other order deadlocks under parallel requests, which a test caught.

## The facts rule

The writer is only given numbered facts and must tag each sentence that uses one: `{f12}`. After writing, `lib/core/script.ts` strips the tags to make the clean version and uses them to build the **Sources and fact check** report. Sentences with numbers but no tag are listed as "lines to verify". The report cannot drift from the script because it is generated from the script's own tags.

## Security notes

- Passwords: scrypt with a random salt. Sessions: a random token in an `HttpOnly`, `SameSite=Lax` cookie; only its SHA-256 is stored.
- Every page, action and API route checks the signed-in user itself (`lib/server/dal.ts`). `proxy.ts` only does an optimistic redirect.
- A script is only ever read by its owner: wrong owner is a 404, never a 403.
- Login and signup answer the same whether or not an email exists. Repeated failures from one address are blocked for 15 minutes.
- Email confirmation uses a button, not the link itself, so link-scanners in email apps cannot use the link up.
- Provider keys live only in the worker's environment and are never sent to the browser.

## Where things live

| Path | What |
| --- | --- |
| `db/schema.ts`, `db/migrations` | Tables and SQL migrations |
| `lib/core` | Credits, ledger, writing rules, lint, script assembly (no framework code, fully tested) |
| `lib/auth` | Passwords, sessions, signup, reset, mail |
| `lib/providers` | Anthropic, TinyFish and demo clients behind two small interfaces |
| `lib/pipeline` | Create, queue, stages |
| `worker/index.ts` | The worker process |
| `app/(auth)`, `app/app`, `app/api` | Screens and endpoints |
| `tests` | 124 tests against a real Postgres |

## Adding a provider

Implement `LlmProvider` or `WebProvider` from `lib/providers/types.ts`, add it to `makeProviders` in `lib/providers/index.ts` and give it a name for `LLM_PROVIDER` or `RESEARCH_PROVIDER`. Add model prices to `lib/providers/prices.ts` so every call is costed.
