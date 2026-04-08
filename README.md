# Whale Watcher

A personalized morning brief newsletter for self-directed investors. Each subscriber gets a daily email at 06:00 PT with current prices for their personal watchlist, market headlines, and an interactive feedback page to tune the next day's picks.

Built as a single Cloudflare Worker. Scheduling, data collection, rendering, and delivery all run on Cloudflare's edge.

[![Deploy](https://github.com/jag18729/whale-watcher-dashboard/actions/workflows/deploy.yml/badge.svg?branch=master)](https://github.com/jag18729/whale-watcher-dashboard/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![D1](https://img.shields.io/badge/Cloudflare-D1-F38020?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/d1/)

**Production:** [ww.vandine.us](https://ww.vandine.us)

## Overview

Whale Watcher solves a simple problem: a small group of friends each track a different watchlist and want a single daily email that summarizes price action across their tickers, with the option to disagree with calls and adjust targets. The platform supports per-user watchlists ("pods"), per-user feedback that influences future briefs, and a no-login feedback page authenticated by a per-user token.

The original design used an LLM agent to research, compose, and send the brief. That layer turned out to be the least reliable part of the system: the agent's `web_fetch` tool is GET-only, the model would hit context overflow on multi-step prompts, and the upstream API rate-limited the morning run on shared free-tier quota. The current design eliminates the agent entirely. The Worker schedules itself, fetches its own data, builds the brief from price action and market headlines, and delivers via Resend. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design rationale.

## Architecture at a glance

```
                Cloudflare cron trigger
                  0 13 * * 1-5  (06:00 PDT)
                  0 14 * * 1-5  (06:00 PST)
                            |
                            v
              Worker scheduled() handler
                            |
                            v
                runMorningBrief(env, today)
                            |
            +---------------+----------------+
            |               |                |
            v               v                v
       Yahoo Finance  Brave Search       D1 read
       (prices)       (headlines)        (users + pods)
            |               |                |
            +-------+-------+----------------+
                    |
                    v
            auto-build brief JSON
            (whale = biggest mover, conviction from |%change|)
                    |
                    v
            render HTML per user
                    |
                    v
            Resend API  -->  email delivered
                    |
                    v
            store brief + watches in D1
```

The same `runMorningBrief` function backs the HTTP endpoint `GET /api/run-morning-brief`, so manual triggers and the scheduled cron run identical code paths.

## Tech stack

| Layer       | Choice                          | Why |
|-------------|---------------------------------|-----|
| Runtime     | Cloudflare Workers              | Free tier, global edge, native cron triggers |
| Framework   | Hono                            | Small, fast, ergonomic router for Workers |
| Database    | Cloudflare D1 (SQLite)          | Co-located with the Worker, no network hop |
| Email       | Resend                          | Simple API, good deliverability, webhook events |
| Prices      | Yahoo Finance public chart API  | Free, no key required |
| Headlines   | Brave Search API                | Independent index, generous free tier |
| Scheduler   | Cloudflare cron triggers        | Built-in, no external scheduler needed |

## Features

- Personalized morning brief per subscriber, gated by their watchlist
- Auto-generated conviction ratings (high / medium / low / hold) derived from price action
- "Today's Whale" spotlight: the largest absolute mover from any user pod
- Interactive feedback page at `/brief/:date?t=<token>` with no login required
- Per-user pod management (request add or remove, queued for review)
- Resend webhook ingestion for delivery, open, and click tracking
- Idempotent daily briefs (re-running the same date overwrites the row in D1)
- Year-round DST handling via dual cron schedules (PDT and PST)
- Server-side HTML rendering for consistent email layout across clients

## Quick start

```bash
git clone https://github.com/jag18729/whale-watcher-dashboard.git
cd whale-watcher-dashboard
npm install

# Create your D1 database and capture the database_id
npx wrangler d1 create whale-watcher

# Edit wrangler.toml: replace database_id with the value from the previous step
# Apply schema
npx wrangler d1 execute whale-watcher --remote --file=src/db/schema.sql

# Edit src/db/seed.sql with your subscribers, then seed
npx wrangler d1 execute whale-watcher --remote --file=src/db/seed.sql

# Configure secrets (interactive)
npx wrangler secret put AGENT_API_KEY     --env production
npx wrangler secret put RESEND_API_KEY    --env production
npx wrangler secret put BRAVE_API_KEY     --env production
npx wrangler secret put FINNHUB_API_KEY   --env production  # optional, dashboard only

# Deploy
npm run deploy
```

The cron triggers in `wrangler.toml` will start firing on the next scheduled boundary. To verify the pipeline immediately without waiting for the next 06:00 PT, hit the HTTP endpoint:

```bash
curl "https://<your-worker-route>/api/run-morning-brief?key=<AGENT_API_KEY>"
```

Full deployment guide: [docs/DEPLOY.md](docs/DEPLOY.md).

## Local development

```bash
cp .env.example .dev.vars
# Fill in .dev.vars with real keys (it is gitignored)
npm run dev
```

`wrangler dev` proxies the local Worker to a tunnel and binds your remote D1 database for development.

To test the scheduled handler locally:

```bash
npm run dev -- --test-scheduled
# Then in another shell:
curl "http://localhost:8787/__scheduled?cron=0+13+*+*+1-5"
```

## API reference

The full reference lives in [docs/API.md](docs/API.md). Quick summary:

| Method | Path                              | Auth          | Description                                       |
|--------|-----------------------------------|---------------|---------------------------------------------------|
| GET    | `/api/health`                     | none          | Liveness check                                    |
| GET    | `/api/run-morning-brief`          | API key       | One-shot: fetch, build, send. Same code as cron   |
| GET    | `/api/prepare-research`           | API key       | Server-side fetch and cache prices and news       |
| GET    | `/api/research-summary`           | API key       | Compact pre-digested research (~2 KB)             |
| GET    | `/api/compile-and-send`           | API key       | Render and send a brief from a JSON payload       |
| POST   | `/api/compile-brief`              | API key       | Same as above, JSON in body                       |
| POST   | `/api/send-email`                 | API key       | Send an arbitrary email through the Worker        |
| GET    | `/api/users`                      | API key       | All users with pods, recent feedback, requests    |
| POST   | `/api/feedback`                   | user token    | Submit agree/disagree and adjusted targets        |
| GET    | `/api/pod`                        | user token    | Get the calling user's pod                        |
| POST   | `/api/pod`                        | user token    | Queue an add or remove ticker request             |
| POST   | `/api/webhooks/resend`            | webhook token | Resend delivery, open, click events               |
| GET    | `/brief/:date?t=<token>`          | user token    | Interactive feedback page for a date              |
| GET    | `/`                               | none          | Finnhub-powered market dashboard                  |

API-key auth accepts the key in either the `X-API-Key` header or the `?key=` query string. The query-string fallback exists because some HTTP clients (notably LLM agent tools) do not pass custom headers reliably to upstream.

## Database schema

```
users           Subscribers with unique feedback tokens
pod_tickers     Per-user watchlist (ticker + sector)
briefs          Daily HTML briefs per user
watches         Individual stock picks within a brief
feedback        User agree/disagree and adjusted targets per watch
pod_requests    Queued ticker add or remove requests
research_cache  Cached research data per date and section
engagement      Resend webhook events (delivered, opened, clicked)
```

Schema source: [`src/db/schema.sql`](src/db/schema.sql). Migrations are tracked in [`src/db/migrations/`](src/db/migrations/).

## Configuration

All runtime configuration is in [`wrangler.toml`](wrangler.toml). The production environment registers two cron triggers (one for PDT, one for PST) so the brief lands at 06:00 local time year-round without timezone math in code.

```toml
[env.production.triggers]
crons = ["0 13 * * 1-5", "0 14 * * 1-5"]
```

Secrets are not in `wrangler.toml`. Set them with `wrangler secret put`. See [`.env.example`](.env.example) for the full list.

## Project layout

```
.
|-- .github/
|   |-- workflows/         GitHub Actions: deploy and lint
|   |-- ISSUE_TEMPLATE/
|   |-- pull_request_template.md
|   |-- dependabot.yml
|-- docs/
|   |-- ARCHITECTURE.md    Design rationale and decision log
|   |-- API.md             Full endpoint reference
|   |-- DEPLOY.md          Deployment runbook
|-- src/
|   |-- worker.js          Hono app entry, scheduled() handler
|   |-- routes/
|   |   |-- api.js         All API endpoints, runMorningBrief
|   |   |-- brief.js       Feedback page route
|   |   |-- dashboard.js   Finnhub market dashboard
|   |   |-- webhooks.js    Resend webhook handler
|   |-- db/
|   |   |-- schema.sql     D1 table definitions
|   |   |-- seed.sql       Example seed data (sanitized)
|   |   |-- queries.js     Parameterized query helpers
|   |   |-- migrations/    Forward-only schema migrations
|   |-- middleware/
|   |   |-- auth.js        API key + user token validation
|   |-- templates/
|       |-- brief-email.js Server-side HTML email renderer
|       |-- brief-page.js  Interactive feedback page template
|-- CHANGELOG.md
|-- CONTRIBUTING.md
|-- SECURITY.md
|-- LICENSE
|-- README.md
|-- package.json
|-- wrangler.toml
```

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, code style, and pull request process. Security issues should be reported per [SECURITY.md](SECURITY.md), not in public GitHub issues.

## License

[MIT](LICENSE) (c) Rafael Garcia.

## Disclaimer

Whale Watcher is an information tool, not financial advice. The conviction ratings are derived from price action heuristics, not investment research. Do your own research before acting on anything in a brief.
