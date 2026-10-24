# Deploy on your own server

Everything runs from one `docker compose` file on a single Linux server you control: **your own Postgres database**, the web app, the worker and an HTTPS proxy. Nothing depends on a hosted database.

> **Honest status.** The code, the database migrations, the backup scripts and the compose file are tested on this project's real Postgres 16 and in a real browser. The Docker *image build* and the real Anthropic and TinyFish calls could not be run in the environment where this was written (no Docker daemon, no API keys), so the first deploy is where those two get proven. Follow section 6 to check them.

## 1. What you need

| Thing | Notes |
| --- | --- |
| A Linux server | 2 vCPU and 4 GB RAM is a comfortable start. Ubuntu 24.04 works. Disk: 20 GB is plenty to begin with |
| A domain | An `A` record pointing at the server's IP, for example `app.leksmedias.com` |
| Docker and Docker Compose | `curl -fsSL https://get.docker.com \| sh` |
| An email sender | An SMTP account (Postmark, Resend, Amazon SES, your own). Without it nobody can confirm their email |
| Anthropic API key | https://console.anthropic.com. Add credit to the account |
| TinyFish API key | Create it at https://agent.tinyfish.ai/api-keys. **Research must be enabled on the account** and the wallet funded for deep research (see [`COSTS.md`](COSTS.md)) |

## 2. First deploy

```bash
git clone https://github.com/leksautomate/leksmedias.git && cd leksmedias
cp .env.example .env
chmod 600 .env
```

Edit `.env`:

```bash
POSTGRES_PASSWORD=<openssl rand -base64 32>
APP_SECRET=<openssl rand -base64 32>
DOMAIN=app.leksmedias.com
NEXT_PUBLIC_SITE_URL=https://app.leksmedias.com

MAIL_DRIVER=smtp
SMTP_URL=smtp://user:password@smtp.yourprovider.com:587
MAIL_FROM="Leksmedia <support@leksmedias.com>"

RESEARCH_PROVIDER=tinyfish
LLM_PROVIDER=anthropic
TINYFISH_API_KEY=...
ANTHROPIC_API_KEY=...
```

Start it:

```bash
docker compose up -d --build
docker compose ps            # db, web, worker and caddy should be running; migrate has exited 0
docker compose logs -f worker
```

Caddy gets a Let's Encrypt certificate for `DOMAIN` automatically once the DNS record points at the server and ports 80 and 443 are open.

Add `NEXT_PUBLIC_SITE_URL` **before** the first build. It is baked into links in emails and page metadata.

## 3. Lock the server down

```bash
sudo ufw default deny incoming
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
sudo ufw enable
```

- Postgres is **not** published to the network: only Caddy (80 and 443) is. Check with `docker compose ps`; the `db` row must show no host port.
- Use SSH keys and turn off password login. Enable automatic security updates (`unattended-upgrades`).
- Keep `.env` at mode `600`. Never commit it.

## 4. Backups (do this on day one)

```bash
crontab -e
15 3 * * *  /home/you/leksmedias/scripts/backup.sh >> /home/you/leksmedias/backups/backup.log 2>&1
```

`scripts/backup.sh` writes a compressed dump to `./backups` and keeps 14 days. **A backup on the same disk is not a backup.** Also copy the folder somewhere else every night: another server (`rsync`), object storage (`rclone`), or a second disk.

Restore (replaces the data, asks you to confirm):

```bash
scripts/restore.sh backups/leks-20261024T031500Z.dump
```

Restore into a spare server once a month to prove the backups work. A round trip of the real schema was verified when this was built, but only your own test proves your copies are good.

## 5. Day to day

| Task | Command |
| --- | --- |
| Update to a new version | `git pull && docker compose up -d --build` (migrations run automatically) |
| See what the writer is doing | `docker compose logs -f worker` |
| Make yourself an admin | `docker compose run --rm web npx tsx scripts/promote-admin.ts you@example.com` |
| Give someone credits | `docker compose run --rm web npx tsx scripts/grant-credits.ts person@example.com 1000 "Beta tester"` |
| Open a database shell | `docker compose exec db psql -U leks leks` |
| Stuck scripts | `select id, status, stage, attempts, heartbeat_at from runs where status in ('queued','running') order by created_at;` |

The worker recovers on its own: if it crashes or the server restarts, runs with no heartbeat for 2 minutes go back to the queue and continue from the last finished stage. Failed scripts refund their credits automatically.

Early-access sign-ups from the landing page are in the `waitlist` table.

> There is no admin screen yet (see [`ADMIN.md`](ADMIN.md)). Until it exists, use the commands above. Never change `credit_balance` with raw SQL: use the grant command so the history stays correct.

## 6. First-deploy checklist

Run through this once, in order. Each item proves something that could not be tested before.

- [ ] `docker compose up -d --build` builds the image and everything starts.
- [ ] `https://your-domain` loads with a valid certificate.
- [ ] Sign up with a real address. The confirmation email arrives (SMTP works).
- [ ] After confirming you have 300 credits.
- [ ] Write a **short standard** script (1,200 words). It finishes, and `select step, model, cost_usd from llm_calls order by id desc limit 10;` shows real model names and costs (Anthropic and TinyFish Search/Fetch work).
- [ ] Compare the run's `cost_usd` with [`COSTS.md`](COSTS.md). **This is the number that tells you whether the prices work.**
- [ ] Write a **deep** script (Creator plan, `npm run grant` to give credits and set `plan='creator'`). A TinyFish research run appears in `provider_events`. If it fails with a 403, research is not enabled on your TinyFish account.
- [ ] Cancel a script mid-way and check the credits come back.
- [ ] `docker compose restart worker` during a script: it should resume, not start over.
- [ ] Run `scripts/backup.sh`, then restore it on a spare machine.

## 7. Not built yet

Payments (Stripe) and plan upgrades, the admin screens, agent access (MCP), editing a script's sections, and the legal-page details (company address and governing law, see [`LEGAL.md`](LEGAL.md)). Paid plans are currently set by hand in the `users.plan` column.
