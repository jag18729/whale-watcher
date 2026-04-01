-- Whale Watcher D1 Schema

CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  token      TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  active     INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pod_tickers (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  ticker     TEXT NOT NULL,
  sector     TEXT,
  added_at   TEXT DEFAULT (datetime('now')),
  removed_at TEXT,
  UNIQUE(user_id, ticker)
);

CREATE TABLE IF NOT EXISTS briefs (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  brief_date TEXT NOT NULL,
  subject    TEXT NOT NULL,
  html       TEXT NOT NULL,
  resend_id  TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, brief_date)
);

CREATE TABLE IF NOT EXISTS watches (
  id           TEXT PRIMARY KEY,
  brief_id     TEXT NOT NULL REFERENCES briefs(id),
  ticker       TEXT NOT NULL,
  direction    TEXT NOT NULL CHECK(direction IN ('surface','dive')),
  conviction   TEXT NOT NULL CHECK(conviction IN ('high','medium','low','hold')),
  entry_price  REAL,
  target_price REAL,
  stop_price   REAL,
  thesis       TEXT,
  is_whale     INTEGER DEFAULT 0,
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feedback (
  id          TEXT PRIMARY KEY,
  watch_id    TEXT NOT NULL REFERENCES watches(id),
  user_id     TEXT NOT NULL REFERENCES users(id),
  agreement   TEXT CHECK(agreement IN ('agree','disagree','skip')),
  adj_target  REAL,
  adj_stop    REAL,
  notes       TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(watch_id, user_id)
);

CREATE TABLE IF NOT EXISTS pod_requests (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  ticker     TEXT NOT NULL,
  action     TEXT NOT NULL CHECK(action IN ('add','remove')),
  created_at TEXT DEFAULT (datetime('now')),
  processed  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS engagement (
  id         TEXT PRIMARY KEY,
  resend_id  TEXT,
  event_type TEXT NOT NULL,
  payload    TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
