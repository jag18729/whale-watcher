# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-04-08

### Changed
- **BREAKING (operational):** The morning brief is now scheduled by Cloudflare Workers cron triggers instead of an external LLM agent. The Worker schedules itself, fetches its own data, and renders the brief. Operators of prior versions should disable any external scheduler that calls the brief endpoints.
- `runMorningBrief(env, date)` extracted from the HTTP handler in `src/routes/api.js` so the same code path serves both `GET /api/run-morning-brief` and the Worker `scheduled()` handler.
- `src/worker.js` now exports both `fetch` and `scheduled` from the default export.
- `wrangler.toml` declares `[env.production.triggers]` with two cron expressions (`0 13 * * 1-5` and `0 14 * * 1-5`) so the brief lands at 06:00 PT year-round across PDT and PST without timezone math in code.

### Added
- `GET /api/run-morning-brief` one-shot endpoint: prepare research, auto-build a brief from prices and headlines, render per user, send via Resend.
- `GET /api/prepare-research` server-side fetch and cache of prices (Yahoo Finance) and news headlines (Brave Search), paced for the Brave free-tier rate limit.
- `GET /api/research-summary` returns a compact (~2 KB) pre-digested summary suitable for downstream consumers with limited context.
- `GET /api/compile-and-send` accepts a brief payload via either `?json=<URL-encoded>` or `?payload=<base64>` query string, complementing the existing `POST /api/compile-brief`.
- Query-string fallback for API key auth (`?key=` accepted in addition to the `X-API-Key` header), to support clients that do not pass custom headers reliably.
- Browser User-Agent on Yahoo Finance requests so Cloudflare egress IPs are not rate-limited.
- Yahoo Finance crypto symbol mapping (`BTC` -> `BTC-USD`, `ETH` -> `ETH-USD`).
- `BRAVE_API_KEY` Worker secret for server-side news fetching.
- `docs/ARCHITECTURE.md` decision log explaining why the agent layer was removed.
- `docs/API.md` full endpoint reference.
- `docs/DEPLOY.md` deployment runbook.
- GitHub Actions workflow for deploy on push to `master`.
- GitHub Actions workflow for lint on pull requests.
- Issue templates and pull request template under `.github/`.
- Dependabot configuration for npm and GitHub Actions.

### Fixed
- `previousClose` for tickers where Yahoo Finance returns `null` now falls back to the second-to-last close in the chart series, so `change_pct` is computed for almost every ticker.

## [1.0.0] - 2026-04-01

### Added
- Initial public release.
- Cloudflare Worker with Hono routing, D1 database, Resend integration.
- Personalized morning brief pipeline driven by an external agent (now deprecated).
- Per-user feedback page at `/brief/:date?t=<token>`.
- Pod management endpoints (add or remove tickers).
- Resend webhook ingestion for delivery, open, and click events.
- Finnhub-powered market dashboard at `/`.

[2.0.0]: https://github.com/jag18729/whale-watcher-dashboard/releases/tag/v2.0.0
[1.0.0]: https://github.com/jag18729/whale-watcher-dashboard/releases/tag/v1.0.0
