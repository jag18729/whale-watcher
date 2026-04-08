# API reference

Base URL: `https://ww.vandine.us` (production)

All endpoints return JSON unless otherwise noted. Errors follow the shape `{"error": "message", "details": "optional"}` with the appropriate HTTP status code.

## Authentication

Two auth modes are used.

**API key auth** is required for all `/api/*` routes that mutate state or return cross-user data. The key is the `AGENT_API_KEY` Worker secret. It can be presented as either:

- `X-API-Key: <key>` header
- `?key=<key>` query string parameter

Both are accepted. Use whichever your client supports. Without a valid key the response is `401 Unauthorized`.

**User token auth** is used for the feedback page and self-service endpoints. Each user has a long-lived token stored in the `users` table. Tokens are passed as `?t=<token>` query string. Without a valid token the response is `401 Unauthorized`.

The Resend webhook uses its own signature verification, not API key auth.

---

## Operations

### `GET /api/health`

Liveness check. No auth.

```bash
curl https://ww.vandine.us/api/health
```

```json
{ "status": "ok", "service": "whale-watcher" }
```

---

### `GET /api/run-morning-brief`

The one-shot endpoint that fetches data, auto-builds the brief, and sends emails. This is the same code path the Cloudflare cron trigger executes.

**Auth:** API key

**Query parameters:**

| Name   | Required | Default       | Description                       |
|--------|----------|---------------|-----------------------------------|
| `date` | no       | today (UTC)   | Brief date in `YYYY-MM-DD` format |
| `key`  | yes*     |               | API key (or use `X-API-Key`)      |

```bash
curl "https://ww.vandine.us/api/run-morning-brief?key=$AGENT_API_KEY"
```

```json
{
  "compiled": true,
  "date": "2026-04-08",
  "results": [
    {
      "user": "Rafa",
      "email": "rafa@example.com",
      "brief_id": "d592465e-8f14-432a-9306-0b11dcf51ac4",
      "sent": true,
      "resend_id": "a2be8215-686b-4780-beab-a4bededbf02b"
    }
  ]
}
```

---

### `GET /api/prepare-research`

Fetch and cache research data without sending any emails. Used internally by `run-morning-brief` and exposed for replay scenarios.

**Auth:** API key

**Query parameters:**

| Name   | Required | Description                       |
|--------|----------|-----------------------------------|
| `date` | yes      | Cache key in `YYYY-MM-DD` format  |

```json
{
  "prepared": true,
  "date": "2026-04-08",
  "tickers_count": 18,
  "prices_ok": 18,
  "news_sections": 3
}
```

---

### `GET /api/research-summary`

Returns a compact (~2 KB) pre-digested summary of the cached research for a date. Built for clients with limited context.

**Auth:** API key

**Query parameters:**

| Name   | Required | Description                       |
|--------|----------|-----------------------------------|
| `date` | yes      | Cache key in `YYYY-MM-DD` format  |

```json
{
  "date": "2026-04-08",
  "tickers": ["AAPL", "BTC", "..."],
  "prices": {
    "SPY": { "price": 659.22, "change_pct": 0.52 }
  },
  "news_headlines": {
    "macro": "...",
    "political": "...",
    "events": "..."
  },
  "news_descriptions": {
    "macro": "...",
    "political": "...",
    "events": "..."
  },
  "users": [
    { "name": "Rafa", "pod_tickers": ["AAPL", "NVDA", "..."] }
  ]
}
```

---

### `GET /api/compile-and-send`

Compile a brief from a JSON payload and send it to all users. The payload can be supplied as either URL-encoded JSON or base64.

**Auth:** API key

**Query parameters (one of):**

| Name      | Description                                           |
|-----------|-------------------------------------------------------|
| `json`    | URL-encoded JSON brief payload                        |
| `payload` | Base64-encoded JSON brief payload (URL-safe accepted) |

**Payload shape:** see [`POST /api/compile-brief`](#post-apicompile-brief).

---

### `POST /api/compile-brief`

The original POST variant of compile-and-send. Same behavior, JSON in the request body.

**Auth:** API key

**Body:**

```json
{
  "date": "2026-04-08",
  "subject": "Whale Watcher -- Wed, Apr 8 -- ...",
  "summary_line": "TSLA down 3.87% leads the pod",
  "sections": {
    "political": { "headline": "...", "bullets": ["..."] },
    "macro": {},
    "events": ["..."]
  },
  "companies": [
    {
      "ticker": "NVDA",
      "price": 170.85,
      "change_pct": -2.1,
      "direction": "dive",
      "conviction": "high",
      "bullets": ["..."],
      "recommendation": "...",
      "entry": null,
      "target": null,
      "stop": null,
      "is_whale": true
    }
  ],
  "funds": [],
  "top_plays": []
}
```

**Response:** identical to `run-morning-brief`.

---

### `POST /api/send-email`

Send an arbitrary HTML email through the Worker. Used for diagnostics and one-off notifications.

**Auth:** API key

**Body:**

```json
{
  "from": "Whale Watcher <whale-watcher@guardquote.vandine.us>",
  "to": "user@example.com",
  "subject": "Test",
  "html": "<p>Hello</p>"
}
```

`from` is optional and defaults to the configured sender. `to` accepts either a string or an array.

---

## Users and pods

### `GET /api/users`

Returns all active users with their pods, recent feedback (up to 20 items), and pending pod requests.

**Auth:** API key

```json
[
  {
    "id": "u_rafa",
    "email": "rafa@example.com",
    "name": "Rafa",
    "token": "...",
    "pod": [
      { "ticker": "NVDA", "sector": "tech" }
    ],
    "recent_feedback": [],
    "pod_requests": []
  }
]
```

### `GET /api/pod`

Get the calling user's pod.

**Auth:** user token

```bash
curl "https://ww.vandine.us/api/pod?t=$USER_TOKEN"
```

```json
{
  "user": "Rafa",
  "pod": [
    { "ticker": "NVDA", "sector": "tech" }
  ]
}
```

### `POST /api/pod`

Queue a request to add or remove a ticker.

**Auth:** user token

**Body:**

```json
{ "ticker": "NVDA", "action": "add" }
```

`action` must be `add` or `remove`.

---

## Feedback

### `POST /api/feedback`

Submit feedback on watches in a brief.

**Auth:** user token

**Body:**

```json
{
  "items": [
    {
      "watch_id": "abc-123",
      "agreement": "agree",
      "adj_target": null,
      "adj_stop": null,
      "notes": "Looks good"
    }
  ]
}
```

`agreement` must be `agree`, `disagree`, or `skip`. `adj_target` and `adj_stop` are optional overrides.

---

## Webhooks

### `POST /api/webhooks/resend`

Resend webhook receiver. Verifies the signature, stores the event in the `engagement` table, and returns 200.

**Auth:** Resend webhook secret (header signature)

Subscribe to this endpoint in the Resend dashboard for delivery, open, and click tracking.

---

## Pages

### `GET /brief/:date?t=<token>`

Interactive feedback page rendered server-side. Shows all watches in the user's brief for the given date, with controls for agree/disagree, adjusted target, adjusted stop, and notes.

### `GET /` and `GET /dashboard`

Finnhub-powered live market dashboard. No auth. Useful as a public landing page.
