# Deployment runbook

This document covers the full deployment of Whale Watcher to a fresh Cloudflare account, plus the day-to-day operations of the running production service.

## Prerequisites

- A Cloudflare account with Workers enabled
- A registered domain on Cloudflare (or a free `*.workers.dev` subdomain)
- Node.js 20 or newer
- A Resend account with a verified sending domain
- A Brave Search API key (free tier is fine: 1 req/sec, 2000/month)
- Optional: a Finnhub API key for the public dashboard at `/`

## First-time setup

### 1. Clone and install

```bash
git clone https://github.com/jag18729/whale-watcher.git
cd whale-watcher
npm install
```

### 2. Authenticate Wrangler

```bash
npx wrangler login
```

This opens a browser for OAuth. The token is stored under `~/.wrangler` and is per-machine.

### 3. Create the D1 database

```bash
npx wrangler d1 create whale-watcher
```

The output includes a `database_id`. Copy it.

### 4. Configure `wrangler.toml`

Open `wrangler.toml` and replace the `database_id` value under both the top-level `[[d1_databases]]` block and the `[[env.production.d1_databases]]` block with the value from the previous step.

If you are using your own domain, also update the `routes` block under `[env.production]` with your zone and pattern.

### 5. Apply the schema

```bash
npx wrangler d1 execute whale-watcher --remote --file=src/db/schema.sql
```

Verify with:

```bash
npx wrangler d1 execute whale-watcher --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table'"
```

You should see `users`, `pod_tickers`, `briefs`, `watches`, `feedback`, `pod_requests`, `research_cache`, `engagement`.

### 6. Seed users

Edit `src/db/seed.sql` with your subscribers. Each user needs a unique long random `token` (32 hex characters is fine):

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

Then apply:

```bash
npx wrangler d1 execute whale-watcher --remote --file=src/db/seed.sql
```

### 7. Set Worker secrets

```bash
npx wrangler secret put AGENT_API_KEY    --env production
npx wrangler secret put RESEND_API_KEY   --env production
npx wrangler secret put BRAVE_API_KEY    --env production
npx wrangler secret put FINNHUB_API_KEY  --env production    # optional
```

`AGENT_API_KEY` is a shared secret you choose. `RESEND_API_KEY` comes from your Resend dashboard. `BRAVE_API_KEY` from the Brave Search API portal.

### 8. Deploy

```bash
npm run deploy
```

The output should include your route binding and the cron schedules:

```
Deployed whale-watcher-dashboard-production triggers
  ww.vandine.us/* (zone name: vandine.us)
  schedule: 0 13 * * 1-5
  schedule: 0 14 * * 1-5
```

### 9. Smoke test

```bash
curl https://<your-route>/api/health
curl "https://<your-route>/api/run-morning-brief?key=$AGENT_API_KEY"
```

The second call should return `{"compiled": true, "results": [...]}` and your subscribers should receive an email within seconds.

### 10. Configure Resend webhook (optional)

In the Resend dashboard, add a webhook pointing at `https://<your-route>/api/webhooks/resend` and subscribe to the events you care about (`email.delivered`, `email.opened`, `email.clicked`). Copy the signing secret and store it as the `RESEND_WEBHOOK_SECRET` Worker secret.

## Day-to-day operations

### Trigger a brief manually

```bash
curl "https://ww.vandine.us/api/run-morning-brief?key=$AGENT_API_KEY"
```

For a specific historical date:

```bash
curl "https://ww.vandine.us/api/run-morning-brief?key=$AGENT_API_KEY&date=2026-04-08"
```

### Inspect the schedule

```bash
npx wrangler triggers deploy --env production
```

This is idempotent and prints the current trigger configuration. Cron triggers are also visible in the Cloudflare dashboard under Workers and Pages -> your worker -> Triggers.

### Tail Worker logs

```bash
npx wrangler tail --env production
```

### Inspect D1

```bash
# Recent briefs
npx wrangler d1 execute whale-watcher --remote \
  --command "SELECT user_id, brief_date, subject, resend_id FROM briefs ORDER BY created_at DESC LIMIT 10"

# Today's research cache
npx wrangler d1 execute whale-watcher --remote \
  --command "SELECT section, length(data) as bytes FROM research_cache WHERE cache_date = date('now')"

# Pending pod requests
npx wrangler d1 execute whale-watcher --remote \
  --command "SELECT user_id, ticker, action, created_at FROM pod_requests WHERE processed = 0"
```

### Add or remove a subscriber

```bash
# Add
npx wrangler d1 execute whale-watcher --remote --command "
INSERT INTO users (id, email, name, token) VALUES
  ('u_alice', 'alice@example.com', 'Alice', 'a1b2c3d4e5f6...');

INSERT INTO pod_tickers (id, user_id, ticker, sector) VALUES
  (lower(hex(randomblob(8))), 'u_alice', 'AAPL', 'tech'),
  (lower(hex(randomblob(8))), 'u_alice', 'NVDA', 'tech');
"

# Disable
npx wrangler d1 execute whale-watcher --remote \
  --command "UPDATE users SET active = 0 WHERE id = 'u_alice'"
```

### Apply a migration

```bash
npx wrangler d1 execute whale-watcher --remote \
  --file=src/db/migrations/0003_add_alerts.sql
```

After the migration applies cleanly to production, update `src/db/schema.sql` to reflect the cumulative state and commit.

### Roll back a deploy

Cloudflare keeps the previous version. From the dashboard, navigate to Workers and Pages -> your worker -> Deployments -> previous version -> Rollback. There is no automated rollback in this repo's CI workflow; the deploy action only rolls forward.

## Troubleshooting

### The morning brief did not arrive

1. Check the Cloudflare dashboard for the worker. Under Triggers, verify both cron schedules are present and enabled.
2. Tail the logs: `npx wrangler tail --env production` and trigger manually.
3. Check D1 for a brief row for today: `SELECT * FROM briefs WHERE brief_date = date('now')`.
4. Check Resend for delivery status. If the email reached Resend but bounced, the issue is in the upstream mailbox.
5. If D1 has no row for today, the cron handler did not run. Confirm the schedule has not been removed. Re-deploy with `npm run deploy` to re-register triggers.

### Yahoo Finance returns null prices

Cloudflare egress IPs can occasionally hit Yahoo's bot detection. The Worker spoofs a Chrome User-Agent to mitigate this. If prices are still missing:

- Check the Worker logs for a non-200 response from `query1.finance.yahoo.com`.
- Yahoo occasionally returns 200 with no `regularMarketPrice`. The Worker falls back to the second-to-last close in the chart series. Thinly-traded tickers may still resolve to null.

### Brave Search returns 429

The free Brave plan is 1 req/sec, 2000/month. The Worker paces calls 1.1 seconds apart, but if you trigger multiple manual runs in the same minute you can still exceed the per-second limit. Wait and retry, or upgrade your Brave plan.

### Resend webhook is not firing

- Verify the webhook URL in the Resend dashboard matches your production route.
- Verify `RESEND_WEBHOOK_SECRET` is set as a Worker secret.
- Check the Worker logs while triggering a test event from the Resend dashboard.

## CI/CD

The `.github/workflows/deploy.yml` workflow deploys on push to `master`. It requires the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets in the GitHub repository settings. Create a scoped API token in the Cloudflare dashboard under My Profile -> API Tokens with the `Edit Cloudflare Workers` template, then add it as a repository secret.
