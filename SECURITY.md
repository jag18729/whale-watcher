# Security policy

## Supported versions

Only the latest released version on the `master` branch receives security fixes. Older tagged releases are not patched.

## Reporting a vulnerability

If you find a security issue, please report it privately. Do not open a public GitHub issue.

Email: **security@vandine.us**

Please include:

- A description of the vulnerability and its impact.
- Steps to reproduce. A proof-of-concept request, payload, or curl command is ideal.
- The commit hash or version ID where you observed the issue.
- Any suggested mitigation if you have one.

## Response expectations

You will receive an acknowledgement within 72 hours. A fix or mitigation plan will follow within 14 days for issues that affect production. Coordinated disclosure is preferred: please give us a reasonable window to ship a fix before publishing details.

## Scope

In scope:

- The Worker source in this repository
- The `wrangler.toml` configuration
- The D1 schema and query layer
- Authentication and authorization in `src/middleware/auth.js`
- Any handler that processes user input

Out of scope:

- Third-party services (Resend, Brave Search, Yahoo Finance, Cloudflare). Report issues with those services to their respective vendors.
- Social engineering of subscribers or maintainers.
- Denial-of-service via traffic floods. Cloudflare's edge handles those at the network layer.
- Vulnerabilities that require a compromised Cloudflare account or leaked Worker secret.

## Hardening notes

- All API key auth accepts the key via `X-API-Key` header or `?key=` query string. Treat both as equivalent secrets.
- User feedback tokens are bearer secrets in URL query strings. Briefs are not designed to be forwarded; if a subscriber forwards their email, the recipient gains the same write access to their feedback and pod requests.
- D1 queries are parameterized via `prepare(...).bind(...)`. Do not introduce string interpolation into SQL statements.
- The Resend webhook handler verifies the signing secret before persisting events.
