# Whale Watcher

**Personalized morning brief newsletter, built to run itself**

A single Cloudflare Worker that fetches market data, builds per-subscriber briefs with conviction-rated picks, sends them via Resend, and collects feedback through an interactive web page. No external scheduler, no agent layer, no runtime to manage.

[![Deploy](https://github.com/jag18729/whale-watcher/actions/workflows/deploy.yml/badge.svg?branch=master)](https://github.com/jag18729/whale-watcher/actions/workflows/deploy.yml)
[![Lint](https://github.com/jag18729/whale-watcher/actions/workflows/lint.yml/badge.svg)](https://github.com/jag18729/whale-watcher/actions/workflows/lint.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Features

- **Daily Morning Brief**: Automated at 06:00 PT via Cloudflare cron triggers, year-round DST handling
- **Personal Watchlists**: Each subscriber maintains their own "pod" of tickers
- **Conviction Ratings**: Auto-generated (high / medium / low / hold) from price action magnitude
- **Today's Whale**: Spotlight pick, the largest absolute mover from any user's pod
- **Interactive Feedback**: Token-authenticated web page with agree/disagree, target adjustments, and field notes
- **Live Pod Management**: Add and remove tickers instantly from the feedback page
- **Webhook Tracking**: Resend delivery, open, and click events stored in D1

---

## Live

**Production:** [ww.vandine.us](https://ww.vandine.us)

| Page | Description |
|------|-------------|
| [Morning Brief](https://ww.vandine.us/brief/2026-04-10) | Feedback page (token required) |
| [Health Check](https://ww.vandine.us/api/health) | Liveness endpoint |
| [Live Quotes](https://ww.vandine.us/api/quotes?symbols=SPY,QQQ,NVDA) | Server-side price proxy |
| [Architecture](docs/ARCHITECTURE.md) | Design rationale and decision log |
| [API Reference](docs/API.md) | Full endpoint documentation |
| [Deploy Runbook](docs/DEPLOY.md) | First-time setup and operations |

---

## Architecture

```mermaid
flowchart TB
    subgraph schedule [" "]
        direction LR
        cron["Cloudflare Cron<br/><code>0 13 * * 1-5</code> PDT<br/><code>0 14 * * 1-5</code> PST"]
        manual["Manual trigger<br/><code>GET /api/run-morning-brief</code>"]
    end

    cron & manual --> run["<b>runMorningBrief</b><br/><i>same code path</i>"]

    run --> yahoo["Yahoo Finance<br/>prices for all pod tickers"]
    run --> brave["Brave Search<br/>3 headline queries, paced 1.1s"]
    run --> d1r[("D1 read<br/>users, pods, feedback")]

    yahoo & brave --> cache[("D1 write<br/>research_cache")]
    yahoo & brave & d1r --> build["Auto-build brief JSON<br/>whale = largest |%change|<br/>conviction from magnitude"]

    build --> loop{{"For each subscriber"}}
    loop --> render["Render HTML<br/>server-side template"]
    render --> resend["Resend API<br/>email delivered"]
    render --> d1w[("D1 write<br/>briefs + watches")]

    resend --> inbox(["Subscriber inbox"])
    inbox -. "Review & Tune link" .-> brief["Feedback page<br/><code>/brief/:date?t=token</code>"]
    brief -. "agree, disagree, adjust" .-> d1f[("D1 write<br/>feedback + pod changes")]

    style schedule fill:none,stroke:none
    style cron fill:#0B1C24,color:#F2EDE2,stroke:#2B5F6B
    style manual fill:#0B1C24,color:#F2EDE2,stroke:#2B5F6B
    style run fill:#E6B422,color:#141414,stroke:#141414,stroke-width:2px
    style yahoo fill:#2B5F6B,color:#F2EDE2,stroke:#2B5F6B
    style brave fill:#2B5F6B,color:#F2EDE2,stroke:#2B5F6B
    style build fill:#F2EDE2,color:#141414,stroke:#2B5F6B
    style render fill:#F2EDE2,color:#141414,stroke:#2B5F6B
    style resend fill:#6B7A3A,color:#F2EDE2,stroke:#6B7A3A
    style inbox fill:#6B7A3A,color:#F2EDE2,stroke:#6B7A3A
    style brief fill:#F2EDE2,color:#141414,stroke:#B8451F,stroke-width:2px
    style d1r fill:#0B1C24,color:#F2EDE2,stroke:#2B5F6B
    style d1w fill:#0B1C24,color:#F2EDE2,stroke:#2B5F6B
    style d1f fill:#0B1C24,color:#F2EDE2,stroke:#2B5F6B
    style cache fill:#0B1C24,color:#F2EDE2,stroke:#2B5F6B
    style loop fill:#E6B422,color:#141414,stroke:#141414
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Runtime | Cloudflare Workers | Free tier, global edge, native cron triggers, zero servers |
| Framework | Hono | 14 KB router, native Workers support, Express-like ergonomics |
| Database | Cloudflare D1 (SQLite) | Co-located with the Worker, sub-ms reads, no connection pool |
| Email | Resend | Simple API, domain verification, webhook events for tracking |
| Prices | Yahoo Finance chart API | Free, no key required, global coverage |
| Headlines | Brave Search API | Independent index, 2000 req/month free tier |
| Scheduler | Cloudflare cron triggers | Built-in, no external cron or agent needed |
| Toolchain | Bun 1.3 | Fast installs, native ES modules, replaces Node + npm |
| Design | Bathythermograph editorial | Hand-written CSS, Fraunces serif + IBM Plex Mono, no Tailwind |

---

## Quick Start

Requires [Bun](https://bun.sh) 1.3+ and a [Cloudflare](https://dash.cloudflare.com) account.

```bash
git clone https://github.com/jag18729/whale-watcher.git
cd whale-watcher
bun install

# Create D1 database
bunx wrangler d1 create whale-watcher
# Update database_id in wrangler.toml

# Apply schema and seed
bunx wrangler d1 execute whale-watcher --remote --file=src/db/schema.sql
bunx wrangler d1 execute whale-watcher --remote --file=src/db/seed.sql

# Set secrets
bunx wrangler secret put AGENT_API_KEY   --env production
bunx wrangler secret put RESEND_API_KEY  --env production
bunx wrangler secret put BRAVE_API_KEY   --env production

# Deploy
bun run deploy
```

Verify immediately (no need to wait for the cron):

```bash
curl "https://<your-route>/api/run-morning-brief?key=<AGENT_API_KEY>"
```

Full setup: [docs/DEPLOY.md](docs/DEPLOY.md)

---

## Local Development

```bash
cp .env.example .dev.vars
bun run dev

# Test the scheduled handler
bun run dev -- --test-scheduled
curl "http://localhost:8787/__scheduled?cron=0+13+*+*+1-5"
```

---

## API

Full reference: [docs/API.md](docs/API.md)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | none | Liveness check |
| GET | `/api/run-morning-brief` | API key | One-shot: fetch, build, send (same as cron) |
| GET | `/api/quotes` | none | Server-side price proxy (Yahoo Finance) |
| GET | `/api/prepare-research` | API key | Fetch and cache prices + news |
| GET | `/api/research-summary` | API key | Compact pre-digested research (~2 KB) |
| GET | `/api/compile-and-send` | API key | Render and send brief from JSON payload |
| GET | `/api/users` | API key | All users with pods and feedback |
| POST | `/api/feedback` | token | Submit agree/disagree and adjusted targets |
| POST | `/api/pod` | token | Add or remove a ticker (applied immediately) |
| GET | `/brief/:date` | token | Interactive feedback page |

API key auth accepts `X-API-Key` header or `?key=` query string.

---

## Database

8 tables in Cloudflare D1. Schema: [`src/db/schema.sql`](src/db/schema.sql)

| Table | Purpose |
|-------|---------|
| `users` | Subscribers with unique feedback tokens |
| `pod_tickers` | Per-user watchlist (ticker + sector) |
| `briefs` | Daily HTML briefs per user |
| `watches` | Individual stock picks within a brief |
| `feedback` | User agree/disagree + adjusted targets per watch |
| `pod_requests` | Audit trail for ticker add/remove actions |
| `research_cache` | Cached prices and news by date |
| `engagement` | Resend webhook events (delivered, opened, clicked) |

---

## Project Structure

```
src/
  worker.js                Entry point, fetch + scheduled handlers
  routes/
    api.js                 All endpoints, runMorningBrief, fetchYahooPrice, braveSearch
    brief.js               Token-gated feedback page route
    dashboard.js           Market overview page
    webhooks.js            Resend webhook receiver
  db/
    schema.sql             D1 table definitions
    seed.sql               Example seed data (sanitized)
    queries.js             Parameterized query helpers
    migrations/            Forward-only schema migrations
  middleware/
    auth.js                API key + user token validation
  templates/
    tokens.js              Design system: colors, type, motion constants
    base-styles.js         Shared CSS with Fraunces/IBM Plex Mono, paper grain, chart grid
    brief-page.js          Interactive feedback page (bathythermograph editorial)
    brief-email.js         Server-side HTML email renderer
docs/
  ARCHITECTURE.md          Design rationale and decision log
  API.md                   Full endpoint reference with examples
  DEPLOY.md                Deployment runbook and operations guide
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, code style, and PR process. Security issues: [SECURITY.md](SECURITY.md).

---

## License

[MIT](LICENSE) -- Rafael Garcia

Not financial advice. Do your own research.
