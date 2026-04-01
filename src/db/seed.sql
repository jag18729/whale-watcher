-- Seed: Two initial users

INSERT OR IGNORE INTO users (id, email, name, token) VALUES
  ('u_rafa', 'rafael.garcia.contact.me@gmail.com', 'Rafa', 'a7f3c9e1b4d2f8a6c0e5d7b3f1a9c4e2'),
  ('u_jd',   'jdpulido92@yahoo.com',               'JD',   'b8e4d0f2c5a3e9b7d1f6c8a4e2b0d5f3');

-- Rafa's default pod
INSERT OR IGNORE INTO pod_tickers (id, user_id, ticker, sector) VALUES
  ('p01', 'u_rafa', 'AAPL',  'tech'),
  ('p02', 'u_rafa', 'MSFT',  'tech'),
  ('p03', 'u_rafa', 'GOOGL', 'tech'),
  ('p04', 'u_rafa', 'META',  'tech'),
  ('p05', 'u_rafa', 'NVDA',  'tech'),
  ('p06', 'u_rafa', 'TSLA',  'tech'),
  ('p07', 'u_rafa', 'PLTR',  'tech'),
  ('p08', 'u_rafa', 'XOM',   'energy'),
  ('p09', 'u_rafa', 'CVX',   'energy'),
  ('p10', 'u_rafa', 'OXY',   'energy'),
  ('p11', 'u_rafa', 'LMT',   'defense'),
  ('p12', 'u_rafa', 'RTX',   'defense'),
  ('p13', 'u_rafa', 'BTC',   'crypto'),
  ('p14', 'u_rafa', 'ETH',   'crypto'),
  ('p15', 'u_rafa', 'VOO',   'fund');

-- JD's default pod (same starting point, will diverge via feedback)
INSERT OR IGNORE INTO pod_tickers (id, user_id, ticker, sector) VALUES
  ('p16', 'u_jd', 'AAPL',  'tech'),
  ('p17', 'u_jd', 'MSFT',  'tech'),
  ('p18', 'u_jd', 'GOOGL', 'tech'),
  ('p19', 'u_jd', 'META',  'tech'),
  ('p20', 'u_jd', 'NVDA',  'tech'),
  ('p21', 'u_jd', 'TSLA',  'tech'),
  ('p22', 'u_jd', 'PLTR',  'tech'),
  ('p23', 'u_jd', 'XOM',   'energy'),
  ('p24', 'u_jd', 'CVX',   'energy'),
  ('p25', 'u_jd', 'OXY',   'energy'),
  ('p26', 'u_jd', 'LMT',   'defense'),
  ('p27', 'u_jd', 'RTX',   'defense'),
  ('p28', 'u_jd', 'BTC',   'crypto'),
  ('p29', 'u_jd', 'ETH',   'crypto'),
  ('p30', 'u_jd', 'VOO',   'fund');
