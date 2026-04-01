-- Seed: Example users (replace with real data)
-- Run: npx wrangler d1 execute <db-name> --remote --file=src/db/seed.sql

INSERT OR IGNORE INTO users (id, email, name, token) VALUES
  ('u_demo', 'user@example.com', 'Demo', 'replace_with_random_32char_hex_token_here');

-- Demo pod
INSERT OR IGNORE INTO pod_tickers (id, user_id, ticker, sector) VALUES
  ('p01', 'u_demo', 'AAPL',  'tech'),
  ('p02', 'u_demo', 'NVDA',  'tech'),
  ('p03', 'u_demo', 'MSFT',  'tech'),
  ('p04', 'u_demo', 'XOM',   'energy'),
  ('p05', 'u_demo', 'VOO',   'fund');
