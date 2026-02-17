# 🐋 Whale Watcher Dashboard

Live market intelligence dashboard with real-time stock data.

## Features
- 📊 Market indices (SPY, QQQ, DIA, IWM)
- 💻 Tech watchlist (AAPL, MSFT, GOOGL, META, NVDA, TSLA, PLTR)
- 🛢️ Energy rotation (XOM, CVX, OXY, XLE, USO)
- 🛡️ Defense sector (LMT, RTX, NOC, GD, LHX)
- 🎯 Conviction board with trade ideas
- ⚡ 30-second auto-refresh
- 🔒 Protected by Cloudflare Access + WARP

## Stack
- **Runtime:** Cloudflare Workers
- **Data:** Finnhub API
- **Auth:** Cloudflare Zero Trust Access
- **Domain:** ww.vandine.us

## Deploy
```bash
wrangler secret put FINNHUB_API_KEY
wrangler deploy --env production
```

⚠️ Not financial advice. DYOR.
