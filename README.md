# Whale Watcher

Personalized stock market newsletter platform with AI-powered research, conviction-rated recommendations, and interactive feedback. Built on Cloudflare Workers + D1.

**Live:** [ww.vandine.us](https://ww.vandine.us)

## How It Works

An AI agent researches the market every morning, then compiles a personalized brief for each subscriber based on their watchlist ("pod") and feedback history. Each brief includes conviction-rated stock picks, macro analysis, and a spotlight "Today's Whale" top pick.

```
5:50 AM  Research Phase    AI agent searches, fetches prices, caches in D1
6:10 AM  Email Phase       Agent analyzes cache, assigns convictions, sends briefs
         Feedback Loop     Subscribers tune picks via interactive web page
```

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Cloudflare Workers |
| Framework | Hono |
| Database | Cloudflare D1 (SQLite) |
| Email | Resend API |
| Search | Brave Search API |
| Prices | Yahoo Finance |
| Agent | OpenClaw (Gemini 2.5 Flash) |
| Domain | ww.vandine.us |

## Features

- **Personalized briefs** per subscriber based on individual watchlist and feedback
- **Conviction ratings** (High / Medium / Low / Hold) with entry, target, and stop prices
- **Today's Whale** spotlight pick with full thesis
- **Interactive feedback page** at `/brief/:date` for tuning picks
- **Pod management** to add/remove tickers from your watchlist
- **Research caching** in D1 for reliable two-phase pipeline
- **Server-side HTML rendering** for consistent email design
- **Resend webhook tracking** for delivery, open, and click events
- **Real-time dashboard** with Finnhub market data

## Architecture

```
                    OpenClaw Agent (Cron)
                    |                  |
              web_search          web_fetch
              (Brave API)         (Yahoo Finance)
                    |                  |
                    v                  v
              POST /api/research-cache (D1)
                         |
                         v
                GET /api/research-cache
                GET /api/users (pods + feedback)
                         |
                         v
              POST /api/compile-brief
                    |         |
              Render HTML   Store in D1
                    |         |
                    v         v
              Resend API    briefs + watches
                    |
                    v
              Email arrives with "Review & Tune" link
                    |
                    v
              /brief/:date?t=<token>
              User submits feedback -> D1
                    |
                    v
              Next morning: agent reads feedback, adjusts convictions
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | None | Market dashboard (Finnhub) |
| GET | `/brief/:date` | `?t=token` | Interactive feedback page |
| GET | `/api/health` | None | Health check |
| GET | `/api/users` | API key | All users with pods and feedback |
| POST | `/api/briefs` | API key | Store a brief with watches |
| POST | `/api/research-cache` | API key | Cache research data |
| GET | `/api/research-cache` | API key | Read cached research |
| POST | `/api/compile-brief` | API key | Render HTML, send email, store brief |
| POST | `/api/send-email` | API key | Send arbitrary email via Resend |
| POST | `/api/feedback` | `?t=token` | Submit feedback on watches |
| POST | `/api/pod` | `?t=token` | Add/remove tickers |
| GET | `/api/pod` | `?t=token` | Get user's pod |
| POST | `/api/webhooks/resend` | Webhook secret | Resend delivery events |

## D1 Schema

```
users           Subscribers with unique feedback tokens
pod_tickers     Per-user watchlist (ticker + sector)
briefs          Daily HTML briefs per user
watches         Individual stock picks within a brief
feedback        User agree/disagree + adjusted targets per watch
pod_requests    Queued ticker add/remove requests
research_cache  Cached search results by date and section
engagement      Resend webhook events (delivered, opened, clicked)
```

## Setup

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- Cloudflare account with Workers and D1
- [Resend](https://resend.com) account with verified domain
- [Finnhub](https://finnhub.io) API key (free tier)
- [Brave Search](https://brave.com/search/api/) API key (free tier, 2000 req/month)

### Deploy

```bash
# Install dependencies
npm install

# Create D1 database (or use existing)
npx wrangler d1 create whale-watcher

# Update wrangler.toml with your database ID

# Run schema migration
npx wrangler d1 execute <db-name> --remote --file=src/db/schema.sql

# Seed users (edit seed.sql with your data first)
npx wrangler d1 execute <db-name> --remote --file=src/db/seed.sql

# Set secrets
npx wrangler secret put FINNHUB_API_KEY --env production
npx wrangler secret put RESEND_API_KEY --env production
npx wrangler secret put AGENT_API_KEY --env production

# Deploy
npx wrangler deploy --env production
```

### Local Development

```bash
cp .env.example .dev.vars
# Edit .dev.vars with your keys
npm run dev
```

## Whale Watching Glossary

| Term | Meaning |
|------|---------|
| Whale | Top conviction pick of the day |
| Pod | Your personal watchlist |
| Surface | Bullish / going up |
| Dive | Bearish / going down |
| Watch | An individual stock pick with conviction rating |

## Project Structure

```
src/
  worker.js              Hono app entry point
  routes/
    api.js               All API endpoints
    brief.js             Feedback page route
    dashboard.js         Finnhub market dashboard
    webhooks.js          Resend webhook handler
  db/
    schema.sql           D1 table definitions
    seed.sql             Example seed data
    queries.js           Parameterized query helpers
  middleware/
    auth.js              API key + token validation
  templates/
    brief-email.js       Server-side HTML email renderer
    brief-page.js        Interactive feedback page template
```

## Author

Rafael Garcia ([@jag18729](https://github.com/jag18729))

---

Not financial advice. Do your own research.
