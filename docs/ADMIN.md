# Admin plan

The admin area is how you run leksmedias without touching the database: see money in and out, keep research capacity healthy, help users, and change pricing and prompts safely.

It lives at `/admin`, in the same Next.js app, behind its own layout and middleware. It is built in phases (section 8) so the first version is small.

## 1. Who uses it

| Role | Can do |
| --- | --- |
| **Owner** | Everything, including roles, pricing, provider keys, deleting data |
| **Admin** | Users, runs, credits, prompts, flags, waitlist |
| **Support** | Read users and runs, add credits up to a daily limit, trigger refunds, resend emails. Cannot edit pricing or prompts |
| **Finance** | Read revenue, cost and margin, export reports. Cannot see script contents |

Roles are stored on the user row. Every action checks a permission, not a role name, so new roles are a data change.

## 2. Screens

### Overview (home)
Today and last 30 days: new signups, activated users (finished a first script), paying users, MRR, scripts finished, **cost of goods vs revenue and gross margin**, failure rate. Red banners when something needs action (capacity near limit, margin below target, queue stuck).

### Users
Search by email or id. Profile shows plan, credit balance, Stripe status, runs, and a timeline of events. Actions:
- Grant or deduct credits **with a required reason**. Every change is a ledger row, never an edit to a balance.
- Change plan, pause, suspend, delete (with a 7-day soft delete).
- Resend verification email, force sign-out.
- **View as user** (read-only impersonation): opens their dashboard with a banner, every view is written to the audit log, and it never shows payment details.

### Runs
Live table of runs with status, stage, user, words, depth, model, duration, **cost** and credits charged. Filter by failed, slow, deep. Open a run to see the brief, research events, ledger, each LLM call (model, tokens, cost), and the outputs. Actions: cancel, retry from a stage, refund, mark as bad quality (feeds the prompt-quality loop).

Script text is hidden from Support and Finance by default; Admin can open it with a logged reason, because creator scripts can be commercially sensitive.

### Cost and margin
The screen that keeps the business honest.
- Cost per run broken into Claude (by model and step) and TinyFish (by run, `deep` vs `max`).
- Margin by plan, by user, by script length. Top 20 users by cost vs what they pay.
- **Cost per credit and per deep run vs target** ($0.0040 and $3.00 from [`COSTS.md`](COSTS.md)), trend line, alert when above.
- Prices live in a table (`provider_prices`) so a provider change is one edit and history is preserved.

### Capacity and health
- **TinyFish**: research runs in flight vs the limit of 5, queue depth and estimated wait, Fetch URLs used today vs 1,000, Search used this hour vs 500, free research runs left today, wallet balance with low-balance alert.
- **Claude**: requests and tokens per minute, 429 and overload rates, spend today vs a daily cap.
- **Jobs**: queue depth per stage, oldest job age, failure reasons.
- Kill switches: pause new runs, pause deep research only, switch writer model, put the site in read-only mode. Each is one toggle and is audit logged.

### Billing
Stripe subscriptions, failed payments, refunds, coupons and promo codes, credit pack sales. Refund button issues the Stripe refund **and** a credit ledger reversal in one transaction. Revenue export for accounting.

### Pricing and plans
Edit plans, credit allowances, script credit costs, the deep-run credit price, word limits, top-up packs. Changes are **drafted, previewed on the public pricing page, then published**. Existing subscribers stay on their plan version until you migrate them. The public pricing and landing pages read from this table instead of `lib/pricing.ts` once it exists.

### Prompts and models
- Prompt modules (master rules, hook patterns, structures, audit rules) stored as versioned records, not files in the repo. Draft, test against saved briefs, publish, roll back.
- Model routing table: which model runs each step, per plan if wanted.
- A/B: send a percentage of runs to a candidate prompt or model and compare quality score, regeneration rate and cost.
- **Golden set**: 20 saved briefs that run on every prompt change, with the audit lint results diffed against the last version.

### Content and abuse
- Flagged runs (topics touching allegations about real people, graphic content, spam patterns, repeated free-trial signups from one device or IP).
- Block list for topics and domains, source domain deny-list for research.
- Rate limits per user, plan and IP, editable.

### Waitlist and invites
Export, bulk invite in batches, generate invite codes, see conversion from invited to activated. Needed for launch because the landing page is collecting the list now.

### Feature flags and announcements
Per-user and percentage flags for rolling out MCP access, new formats, long-form. Banner messages for incidents and launches.

### Audit log
Append-only: who, what, before and after, when, IP. Searchable, exportable, not editable by anyone including Owner.

## 3. Data it needs

New tables beyond those in [`PLAN.md`](PLAN.md): `roles`, `admin_audit_log`, `provider_prices`, `llm_calls` (run, step, model, tokens in/out/cached, cost), `provider_events` (TinyFish run id, mode, cost, status), `feature_flags`, `prompt_modules` + `prompt_versions`, `model_routes`, `promo_codes`, `abuse_flags`, `waitlist`, `capacity_snapshots` (one row per minute, drives the health charts).

Every paid external call writes a cost row **at call time**. Margin reports are sums over those rows, not estimates.

## 4. Security

- Separate route group `/admin`, server-side checks on every request and every server action. Never rely on hiding the link.
- **MFA required** for all admin roles. Short sessions (8 hours), re-auth for destructive actions (delete user, change prices, change keys).
- Optional IP allow-list for Owner and Admin.
- Principle of least privilege by permission; Support has a daily credit-grant cap.
- Provider keys (TinyFish, Anthropic, Stripe) live in environment secrets, are never shown in the UI after entry, and rotating them needs Owner.
- No script text, emails or keys in application logs. Admin pages that show them log the view instead.
- Impersonation is read-only, time-boxed (30 min), banner-marked and logged.
- Rate limit and lock out admin login attempts.

## 5. Alerts (email and push to Owner)

| Alert | Trigger |
| --- | --- |
| TinyFish wallet low | below $20 or below 3 days of average spend |
| Capacity | queue wait over 20 min, or Fetch over 80% of the daily cap |
| Margin | cost per credit over $0.0040 or per deep run over $3.00 over a day |
| Spend spike | Claude or TinyFish spend over 2x the 7-day average |
| Failure rate | over 5% of runs failing in an hour |
| Abuse | more than 3 free-trial signups from one device in a day |
| Payments | spike in failed payments or refunds |

## 6. Reports (scheduled to email)

Daily: signups, activations, runs, revenue, cost, margin. Weekly: cohort retention, top cost users, prompt version quality, churn reasons. Monthly: finance export.

## 7. Build approach

Reuse the public design system for speed; use a table-heavy layout with server-side pagination and filters in the URL. Charts: one small library, server-fetched data, no live websockets at first (30-second polling is enough for the health screen).

## 8. Phases

1. **Launch minimum**: Overview, Users (credit adjust with reason, suspend), Runs (cost per run, cancel, refund), Capacity page for TinyFish limits, waitlist export, kill switches, audit log, MFA.
2. **Run the business**: Cost and margin, Billing and refunds, promo codes, alerts, abuse flags, invites.
3. **Optimize**: Pricing editor, prompt versions and A/B, golden-set runs, model routing, feature flags, scheduled reports.
4. **Scale**: Team roles beyond four, SSO for the admin area, data export API, anomaly detection.

## 9. Open questions

1. Who besides you will use the admin, and do you want Support and Finance roles at launch?
2. Is it acceptable for Admins to read user scripts with a logged reason, or should scripts stay private to the user unless they share them (stricter, harder to debug)?
3. Do you want to review flagged "allegation about a real person" scripts before delivery, or only after?
