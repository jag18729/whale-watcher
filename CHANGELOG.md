# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2026-04-11

### Added
- Public portfolio landing page at `/` with editorial plates layout: product overview, tech stack badges, specimen brief preview (synthetic data), and links to GitHub/docs/API/changelog. Open Graph meta tags for social sharing.
- Token-gated personal dashboard at `/dashboard` with server-side price fetching via `fetchYahooPrice`, pod tickers grouped by sector with live prices, recent dispatches list (last 7 briefs), and inline pod management.
- `getRecentBriefs(db, userId, limit)` query in `src/db/queries.js` for the dashboard's dispatch history.
- Mermaid diagrams throughout README and docs/ARCHITECTURE.md: system flowchart (color-coded by pipeline stage), morning brief sequence diagram, D1 schema ER diagram, Worker component map.

### Changed
- Email template (`src/templates/brief-email.js`) retrofitted to bathythermograph editorial palette via shared `tokens.js` constants. Georgia serif replaces system sans-serif. Whale spotlight on abyss background instead of light blue. Section labels use tracked editorial small-caps. CTA button in abyss instead of blue. Whale emoji replaced with sonar glyph `)))`.
- `GET /` now serves the public landing instead of the old Tailwind/Finnhub dashboard.
- `GET /dashboard` now requires a user token and shows the personal pod station log. Returns 401 without a token.
- `src/worker.js` routing updated: landing.js for `/`, dashboard.js for `/dashboard`.
- README rewritten to match the guard-quote style (concise tables, live links, badges, Mermaid architecture diagram).
- Pod management section in ARCHITECTURE.md updated to reflect immediate-apply semantics.

### Fixed
- Old dashboard's hardcoded sector watchlists removed; the personal dashboard shows the user's actual pod from D1.

## [2.1.0] - 2026-04-11

### Added
- Bathythermograph editorial design system: `src/templates/tokens.js` (color, type, motion constants) and `src/templates/base-styles.js` (CSS variables, Fraunces + IBM Plex Mono via bunny.net, paper grain, chart grid, conviction gauge, sonar ping, tide-in stagger, editorial form controls).
- Complete `/brief/:date` redesign with mobile-first plates layout, hero whale plate on inverted abyss section, expandable watch drawers, sticky submit bar, and per-user pod composition section.
- HCI refinements: ARIA attributes (`aria-expanded`, `aria-controls`, `aria-live`, `role="status"`), skip-link, focus management on drawer open, tap confirmation pulse, flash auto-clear, 44px touch targets on pod tag close buttons.
- `GET /api/quotes` public endpoint: server-side proxy over Yahoo Finance, no API key required, Finnhub-compatible response shape.
- `POST /api/pod` now applies changes immediately to `pod_tickers` instead of only queuing a request. Handles add, remove, and re-add (soft-deleted rows are re-activated). Client-side DOM updates instantly after a successful action.

### Changed
- Toolchain migrated from Node 20 + npm to Bun 1.3+. `bun.lock` (text format) replaces `package-lock.json`. CI uses `oven-sh/setup-bun@v2`.
- Finnhub API key removed from client-side JavaScript. The dashboard now calls `/api/quotes` instead of making direct Finnhub requests from the browser.
- Agree/disagree button state managed by `data-state` attributes and CSS selectors instead of fragile regex-based className toggling.
- All user-controlled values in the brief page pass through `escapeText`/`escapeAttr` helpers.
- `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, and `X-Content-Type-Options: nosniff` headers on all HTML responses.
- Pod ticker interpolation uses `data-ticker` attributes with event delegation instead of inline `onclick` handlers.
- Tailwind CDN dropped from the brief page (replaced by hand-written design system CSS).

### Fixed
- Agree/disagree buttons were blocked by a capturing-phase click listener that stopped propagation inside `.ww-controls` before the delegation handler could process the click.
- `fetchYahooPrice` now returns absolute price change in addition to percent, used by the quotes proxy.
- Pod re-add after a soft-delete (remove then add the same ticker) now correctly clears `removed_at` instead of silently failing on a UNIQUE constraint.

### Removed
- `package-lock.json` and `.nvmrc` (replaced by `bun.lock` and `packageManager` field).

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

[2.2.0]: https://github.com/jag18729/whale-watcher/releases/tag/v2.2.0
[2.1.0]: https://github.com/jag18729/whale-watcher/releases/tag/v2.1.0
[2.0.0]: https://github.com/jag18729/whale-watcher/releases/tag/v2.0.0
[1.0.0]: https://github.com/jag18729/whale-watcher/releases/tag/v1.0.0
