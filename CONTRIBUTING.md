# Contributing

Thanks for taking the time to contribute. This document covers how to set up a development environment, the expected code style, and the pull request process.

## Code of conduct

Be respectful. Disagree with ideas, not people. Assume good faith.

## Development setup

```bash
git clone https://github.com/jag18729/whale-watcher.git
cd whale-watcher
bun install
cp .env.example .dev.vars
# Fill in .dev.vars with development credentials
bun run dev
```

You will need:

- [Bun](https://bun.sh) 1.3 or newer
- A Cloudflare account with Workers and D1 enabled
- A Resend account with a verified sending domain
- A Brave Search API key (free tier is sufficient)

`wrangler dev` binds to your remote D1 database, so any schema or seed changes you push will affect the development database. Use a separate D1 database for development if you do not want to share state with production.

## Running the scheduled handler locally

```bash
bun run dev -- --test-scheduled
# In a separate terminal:
curl "http://localhost:8787/__scheduled?cron=0+13+*+*+1-5"
```

## Project structure

See the [Project layout](README.md#project-layout) section in the README. New endpoints belong in `src/routes/api.js`. New rendering helpers belong in `src/templates/`. Schema changes belong in `src/db/migrations/` and should be applied with `wrangler d1 execute`.

## Code style

This project does not enforce a formatter via a pre-commit hook, but all submitted code should follow these conventions:

- Two-space indentation, single quotes, semicolons.
- Prefer `const`. Use `let` only when reassignment is required.
- Async functions over `.then()` chains.
- One exported route per logical domain. Group related handlers in the same file.
- Parameterized D1 queries via `db.prepare(...).bind(...)`. Never interpolate user input into SQL.
- Comments explain *why*, not *what*. The code already says what it does.
- No trailing whitespace, no unused imports, no commented-out code.

## Database changes

Schema changes are forward-only migrations under `src/db/migrations/`. Each migration is a numbered SQL file:

```
src/db/migrations/
  0001_initial_schema.sql
  0002_add_research_cache.sql
```

Apply with:

```bash
bunx wrangler d1 execute whale-watcher --remote --file=src/db/migrations/0002_add_research_cache.sql
```

Update `src/db/schema.sql` to reflect the cumulative current state. Update `src/db/queries.js` if the change introduces new accessor patterns.

## Pull request process

1. Fork the repository and create a feature branch from `master`.
2. Make your change in a focused commit. Prefer multiple small commits over one large one if the change has logically separable parts.
3. Update `CHANGELOG.md` under an `## [Unreleased]` heading. Use the same categories as previous entries (Added, Changed, Fixed, Removed, Deprecated, Security).
4. Update relevant docs in `docs/` if you change behavior.
5. Run `bun run deploy` against a staging environment if your change affects the deploy or scheduled handler.
6. Open a pull request using the template. Link any related issues.
7. The CI workflow must pass. A maintainer will review.

Note: The default branch is `master`. CI runs on push and pull requests against it.

## Commit messages

Use the imperative mood, present tense:

```
Add research-summary endpoint
Fix Yahoo Finance previousClose fallback for thin tickers
Document the cron trigger schedule
```

Reference issues with `Closes #123` or `Refs #123` in the commit body, not the subject line.

## Reporting bugs

Open a GitHub issue using the bug report template. Include:

- What you expected to happen
- What actually happened
- A reproduction (curl command, request payload, or commit hash)
- The Worker version ID (visible in the Cloudflare dashboard or `wrangler deploy` output)

If the bug involves a security vulnerability, do not open a public issue. See [SECURITY.md](SECURITY.md).

## Release process

1. Update `CHANGELOG.md`: move `## [Unreleased]` entries under a new version heading with today's date.
2. Bump `version` in `package.json`.
3. Commit: `git commit -m "Release v<version>"`.
4. Tag: `git tag -a v<version> -m "v<version>"`.
5. Push: `git push && git push --tags`.
6. The deploy workflow runs automatically on the tag push.
7. Create a GitHub Release from the tag and paste the changelog entry.
