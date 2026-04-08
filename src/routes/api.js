import { Hono } from 'hono';
import { apiKeyAuth, resolveUserToken } from '../middleware/auth.js';
import {
  getAllUsersWithPods, storeBrief, updateBriefResendId,
  submitFeedback, submitPodRequest, getUserPod,
  upsertResearchCache, getResearchCache,
} from '../db/queries.js';
import { renderBriefEmail } from '../templates/brief-email.js';

const api = new Hono();

// Agent endpoints (API key auth)
api.get('/users', apiKeyAuth(), async (c) => {
  const users = await getAllUsersWithPods(c.env.DB);
  return c.json(users);
});

api.post('/briefs', apiKeyAuth(), async (c) => {
  const body = await c.req.json();
  const { user_id, brief_date, subject, html, watches = [] } = body;

  if (!user_id || !brief_date || !subject || !html) {
    return c.json({ error: 'Missing required fields: user_id, brief_date, subject, html' }, 400);
  }

  const id = crypto.randomUUID();
  const watchesWithIds = watches.map(w => ({ ...w, id: crypto.randomUUID() }));

  const result = await storeBrief(c.env.DB, { id, user_id, brief_date, subject, html, watches: watchesWithIds });
  return c.json({ ...result, brief_id: id }, 201);
});

api.patch('/briefs/:id', apiKeyAuth(), async (c) => {
  const briefId = c.req.param('id');
  const body = await c.req.json();
  if (body.resend_id) {
    await updateBriefResendId(c.env.DB, briefId, body.resend_id);
  }
  return c.json({ ok: true });
});

// User endpoints (token auth)
api.post('/feedback', async (c) => {
  const user = await resolveUserToken(c);
  if (!user) return c.json({ error: 'Invalid or missing token' }, 401);

  const body = await c.req.json();
  const { items = [] } = body;

  if (!items.length) {
    return c.json({ error: 'No feedback items' }, 400);
  }

  const feedbackWithIds = items.map(item => ({ ...item, id: crypto.randomUUID() }));
  const count = await submitFeedback(c.env.DB, user.id, feedbackWithIds);
  return c.json({ saved: count });
});

api.post('/pod', async (c) => {
  const user = await resolveUserToken(c);
  if (!user) return c.json({ error: 'Invalid or missing token' }, 401);

  const body = await c.req.json();
  const { ticker, action } = body;

  if (!ticker || !['add', 'remove'].includes(action)) {
    return c.json({ error: 'Required: ticker, action (add/remove)' }, 400);
  }

  const id = await submitPodRequest(c.env.DB, user.id, ticker, action);
  return c.json({ request_id: id, ticker: ticker.toUpperCase(), action });
});

api.get('/pod', async (c) => {
  const user = await resolveUserToken(c);
  if (!user) return c.json({ error: 'Invalid or missing token' }, 401);

  const pod = await getUserPod(c.env.DB, user.id);
  return c.json({ user: user.name, pod });
});

// Research cache endpoints
api.post('/research-cache', apiKeyAuth(), async (c) => {
  const { date, section, data } = await c.req.json();
  if (!date || !section || !data) {
    return c.json({ error: 'Required: date, section, data' }, 400);
  }
  await upsertResearchCache(c.env.DB, { date, section, data });
  return c.json({ cached: true, date, section });
});

api.get('/research-cache', apiKeyAuth(), async (c) => {
  const date = c.req.query('date');
  if (!date) return c.json({ error: 'Required: ?date=YYYY-MM-DD' }, 400);
  const cache = await getResearchCache(c.env.DB, date);
  return c.json({ date, sections: cache, count: Object.keys(cache).length });
});

// Shared: compile briefs from a payload, render per user, send via Resend, store in D1
async function compileAndSendBriefs(c, body) {
  const { date, subject, summary_line, sections, companies, funds, top_plays, events } = body;

  if (!date || !subject) {
    return c.json({ error: 'Required: date, subject' }, 400);
  }

  const users = await getAllUsersWithPods(c.env.DB);
  const results = [];

  for (const user of users) {
    const reviewUrl = `https://ww.vandine.us/brief/${date}?t=${user.token}`;
    const html = renderBriefEmail({
      date, subject, summary_line, user,
      sections: {
        political: sections?.political,
        macro: sections?.macro,
        companies: companies || sections?.companies || [],
        funds: funds || sections?.funds || [],
        top_plays: top_plays || sections?.top_plays || [],
        events: events || sections?.events || [],
      },
      reviewUrl,
    });

    // Store brief in D1 (upsert: delete old if exists)
    const existing = await c.env.DB.prepare(
      'SELECT id FROM briefs WHERE user_id = ? AND brief_date = ?'
    ).bind(user.id, date).first();
    if (existing) {
      await c.env.DB.prepare('DELETE FROM watches WHERE brief_id = ?').bind(existing.id).run();
      await c.env.DB.prepare('DELETE FROM briefs WHERE id = ?').bind(existing.id).run();
    }

    const briefId = crypto.randomUUID();
    const watches = (companies || sections?.companies || []).map(comp => ({
      id: crypto.randomUUID(),
      ticker: comp.ticker,
      direction: comp.direction || 'surface',
      conviction: comp.conviction || 'hold',
      entry_price: comp.entry || null,
      target_price: comp.target || null,
      stop_price: comp.stop || null,
      thesis: comp.recommendation || comp.bullets?.[0] || null,
      is_whale: comp.is_whale ? 1 : 0,
    }));

    await storeBrief(c.env.DB, {
      id: briefId, user_id: user.id, brief_date: date, subject, html, watches,
    });

    // Send email via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Whale Watcher <whale-watcher@guardquote.vandine.us>',
        to: [user.email],
        subject,
        html,
      }),
    });

    const emailData = await emailRes.json();
    if (emailRes.ok && emailData.id) {
      await updateBriefResendId(c.env.DB, briefId, emailData.id);
    }

    results.push({
      user: user.name, email: user.email, brief_id: briefId,
      sent: emailRes.ok, resend_id: emailData.id || null,
    });
  }

  return c.json({ compiled: true, date, results });
}

api.post('/compile-brief', apiKeyAuth(), async (c) => {
  const body = await c.req.json();
  return compileAndSendBriefs(c, body);
});

// GET variant for agents whose web_fetch is GET-only.
// Accepts payload via either:
//   ?json=<URL-encoded JSON>      (preferred -- agents handle this natively)
//   ?payload=<base64-JSON>        (fallback)
api.get('/compile-and-send', apiKeyAuth(), async (c) => {
  const jsonParam = c.req.query('json');
  const payloadParam = c.req.query('payload');
  if (!jsonParam && !payloadParam) {
    return c.json({ error: 'Required: ?json=<JSON> or ?payload=<base64-JSON>' }, 400);
  }
  let body;
  try {
    if (jsonParam) {
      body = JSON.parse(jsonParam);
    } else {
      const b64 = payloadParam.replace(/-/g, '+').replace(/_/g, '/');
      body = JSON.parse(atob(b64));
    }
  } catch (err) {
    return c.json({ error: 'Invalid payload', details: err.message }, 400);
  }
  return compileAndSendBriefs(c, body);
});

// Agent sends email via Worker (Worker holds the Resend key)
api.post('/send-email', apiKeyAuth(), async (c) => {
  const body = await c.req.json();
  const { from, to, subject, html } = body;

  if (!to || !subject || !html) {
    return c.json({ error: 'Required: to, subject, html' }, 400);
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from || 'Whale Watcher <whale-watcher@guardquote.vandine.us>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return c.json({ error: 'Resend API error', details: data }, res.status);
  }
  return c.json({ sent: true, resend_id: data.id });
});

// ===== Server-side research pipeline =====
// The agent's web_fetch is GET-only and its context blows past 200k if it ingests
// raw web_search results. So the Worker does the heavy lifting:
//   1. /api/prepare-research?date=...   -> fetches prices + Brave news, stores in research_cache
//   2. /api/research-summary?date=...   -> returns ~3KB compact JSON the agent can hold in context
// The agent then crafts the brief from the summary and POSTs via /api/compile-and-send.

async function fetchYahooPrice(ticker) {
  // Yahoo Finance maps crypto symbols as e.g. BTC-USD; map known ones.
  const yahooSym = ({ BTC: 'BTC-USD', ETH: 'ETH-USD' })[ticker] || ticker;
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSym}?range=2d&interval=1d`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });
    if (!r.ok) return { ticker, price: null, change_pct: null, error: `HTTP ${r.status}` };
    const j = await r.json();
    const result = j?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) return { ticker, price: null, change_pct: null };
    const price = meta.regularMarketPrice ?? null;
    // previousClose can be null on Yahoo; fall back to the previous day's close from the series
    const closes = result?.indicators?.quote?.[0]?.close || [];
    const seriesPrev = closes.length >= 2 ? closes[closes.length - 2] : null;
    const prev = meta.previousClose ?? meta.chartPreviousClose ?? seriesPrev ?? null;
    const change_pct = (price != null && prev) ? +(((price - prev) / prev) * 100).toFixed(2) : null;
    return { ticker, price, change_pct };
  } catch (err) {
    return { ticker, price: null, change_pct: null, error: err.message };
  }
}

async function braveSearch(query, apiKey) {
  if (!apiKey) return { query, results: [], error: 'no api key' };
  try {
    const r = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=3`, {
      headers: { 'X-Subscription-Token': apiKey, 'Accept': 'application/json' },
    });
    if (!r.ok) return { query, results: [], error: `HTTP ${r.status}` };
    const j = await r.json();
    const results = (j?.web?.results || []).slice(0, 3).map(x => ({
      title: x.title, description: x.description?.slice(0, 200),
    }));
    return { query, results };
  } catch (err) {
    return { query, results: [], error: err.message };
  }
}

api.get('/prepare-research', apiKeyAuth(), async (c) => {
  const date = c.req.query('date');
  if (!date) return c.json({ error: 'Required: ?date=YYYY-MM-DD' }, 400);

  // 1. Get unique tickers across all user pods
  const users = await getAllUsersWithPods(c.env.DB);
  const tickerSet = new Set(['SPY', 'QQQ', 'DIA']);
  for (const u of users) for (const p of u.pod) tickerSet.add(p.ticker);
  const tickers = [...tickerSet];

  // 2. Fetch prices in parallel from Yahoo (no rate limit)
  const priceResults = await Promise.all(tickers.map(fetchYahooPrice));
  const prices = {};
  for (const r of priceResults) prices[r.ticker] = { price: r.price, change_pct: r.change_pct };
  await upsertResearchCache(c.env.DB, { date, section: 'prices', data: prices });

  // 3. Macro/news searches (paced 1.1s apart for Brave free plan = 1 req/sec)
  const queries = [
    { key: 'macro',     q: 'stock market today S&P futures Fed' },
    { key: 'political', q: 'Federal Reserve FOMC Powell rate decision latest' },
    { key: 'events',    q: 'economic calendar this week earnings' },
  ];
  const news = {};
  for (const { key, q } of queries) {
    const res = await braveSearch(q, c.env.BRAVE_API_KEY);
    news[key] = res;
    await new Promise(r => setTimeout(r, 1100));
  }
  await upsertResearchCache(c.env.DB, { date, section: 'news', data: news });

  return c.json({
    prepared: true, date,
    tickers_count: tickers.length,
    prices_ok: priceResults.filter(r => r.price != null).length,
    news_sections: Object.keys(news).length,
  });
});

api.get('/research-summary', apiKeyAuth(), async (c) => {
  const date = c.req.query('date');
  if (!date) return c.json({ error: 'Required: ?date=YYYY-MM-DD' }, 400);

  const cache = await getResearchCache(c.env.DB, date);
  const prices = cache.prices || {};
  const news = cache.news || {};

  // Pull users for pod context
  const users = await getAllUsersWithPods(c.env.DB);
  const allTickers = new Set();
  for (const u of users) for (const p of u.pod) allTickers.add(p.ticker);

  // Compact summary: prices + 1-line news per section
  const summary = {
    date,
    tickers: [...allTickers].sort(),
    prices,
    news_headlines: {
      macro: news.macro?.results?.[0]?.title || null,
      political: news.political?.results?.[0]?.title || null,
      events: news.events?.results?.[0]?.title || null,
    },
    news_descriptions: {
      macro: news.macro?.results?.[0]?.description || null,
      political: news.political?.results?.[0]?.description || null,
      events: news.events?.results?.[0]?.description || null,
    },
    users: users.map(u => ({ name: u.name, pod_tickers: u.pod.map(p => p.ticker) })),
  };

  return c.json(summary);
});

// Core morning-brief routine. Callable from both the HTTP handler and the
// Cloudflare cron trigger (src/worker.js scheduled handler).
// Returns the same shape as compileAndSendBriefs would return as a Response body.
export async function runMorningBrief(env, date) {
  // 1. Fetch and cache research (prices + news)
  const users = await getAllUsersWithPods(env.DB);
  const tickerSet = new Set(['SPY', 'QQQ', 'DIA']);
  for (const u of users) for (const p of u.pod) tickerSet.add(p.ticker);
  const tickers = [...tickerSet];

  const priceResults = await Promise.all(tickers.map(fetchYahooPrice));
  const prices = {};
  for (const r of priceResults) prices[r.ticker] = { price: r.price, change_pct: r.change_pct };
  await upsertResearchCache(env.DB, { date, section: 'prices', data: prices });

  const queries = [
    { key: 'macro',     q: 'stock market today S&P futures Fed' },
    { key: 'political', q: 'Federal Reserve FOMC Powell rate decision latest' },
    { key: 'events',    q: 'economic calendar this week earnings' },
  ];
  const news = {};
  for (const { key, q } of queries) {
    news[key] = await braveSearch(q, env.BRAVE_API_KEY);
    await new Promise(r => setTimeout(r, 1100));
  }
  await upsertResearchCache(env.DB, { date, section: 'news', data: news });

  // 2. Auto-build the brief from prices + news headlines
  const podTickers = [...new Set(users.flatMap(u => u.pod.map(p => p.ticker)))].sort();
  const movers = podTickers
    .map(t => ({ t, ...prices[t] }))
    .filter(x => x.change_pct != null);

  let whale = movers.length
    ? movers.reduce((a, b) => Math.abs(b.change_pct) > Math.abs(a.change_pct) ? b : a)
    : null;

  const companies = podTickers.map(t => {
    const px = prices[t] || {};
    const change = px.change_pct;
    const direction = change == null ? 'surface' : (change >= 0 ? 'surface' : 'dive');
    const conviction = Math.abs(change ?? 0) > 2 ? 'high' : (Math.abs(change ?? 0) > 0.5 ? 'medium' : 'hold');
    const bullets = change == null
      ? ['Price unavailable.']
      : [`${t} at $${px.price?.toFixed?.(2) ?? px.price} (${change >= 0 ? '+' : ''}${change}% on the day).`];
    return {
      ticker: t,
      price: px.price,
      change_pct: change,
      direction,
      conviction,
      bullets,
      recommendation: null,
      entry: null, target: null, stop: null,
      is_whale: whale && whale.t === t,
    };
  });

  const headline = news.macro?.results?.[0]?.title || 'Markets in focus';
  const macroDesc = news.macro?.results?.[0]?.description?.slice(0, 240) || '';
  const politicalDesc = news.political?.results?.[0]?.description?.slice(0, 240) || '';
  const eventsHeadline = news.events?.results?.[0]?.title || '';

  const summary_line = whale
    ? `${whale.t} ${whale.change_pct >= 0 ? 'up' : 'down'} ${Math.abs(whale.change_pct)}% leads the pod`
    : 'See pod prices below';

  const dateObj = new Date(date + 'T00:00:00Z');
  const dayShort = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dateObj.getUTCDay()];
  const monShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dateObj.getUTCMonth()];
  const subject = `Whale Watcher -- ${dayShort}, ${monShort} ${dateObj.getUTCDate()} -- ${summary_line}`;

  const briefPayload = {
    date,
    subject,
    summary_line,
    sections: {
      political: { headline, bullets: [macroDesc, politicalDesc].filter(Boolean) },
      macro: {},
      events: eventsHeadline ? [eventsHeadline] : [],
    },
    companies,
    funds: [],
    top_plays: whale ? [{ ticker: whale.t, direction: whale.change_pct >= 0 ? 'surface' : 'dive', conviction: 'high', reasoning: `Largest mover today: ${whale.change_pct >= 0 ? '+' : ''}${whale.change_pct}%` }] : [],
  };

  // Inline the same flow as compileAndSendBriefs but operating directly on env (no Hono context).
  const results = [];
  for (const user of users) {
    const reviewUrl = `https://ww.vandine.us/brief/${date}?t=${user.token}`;
    const html = renderBriefEmail({
      date, subject, summary_line, user,
      sections: {
        political: briefPayload.sections.political,
        macro: briefPayload.sections.macro,
        companies: briefPayload.companies,
        funds: briefPayload.funds,
        top_plays: briefPayload.top_plays,
        events: briefPayload.sections.events,
      },
      reviewUrl,
    });

    const existing = await env.DB.prepare(
      'SELECT id FROM briefs WHERE user_id = ? AND brief_date = ?'
    ).bind(user.id, date).first();
    if (existing) {
      await env.DB.prepare('DELETE FROM watches WHERE brief_id = ?').bind(existing.id).run();
      await env.DB.prepare('DELETE FROM briefs WHERE id = ?').bind(existing.id).run();
    }

    const briefId = crypto.randomUUID();
    const watches = briefPayload.companies.map(comp => ({
      id: crypto.randomUUID(),
      ticker: comp.ticker,
      direction: comp.direction || 'surface',
      conviction: comp.conviction || 'hold',
      entry_price: comp.entry || null,
      target_price: comp.target || null,
      stop_price: comp.stop || null,
      thesis: comp.recommendation || comp.bullets?.[0] || null,
      is_whale: comp.is_whale ? 1 : 0,
    }));

    await storeBrief(env.DB, { id: briefId, user_id: user.id, brief_date: date, subject, html, watches });

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Whale Watcher <whale-watcher@guardquote.vandine.us>',
        to: [user.email],
        subject,
        html,
      }),
    });
    const emailData = await emailRes.json();
    if (emailRes.ok && emailData.id) {
      await updateBriefResendId(env.DB, briefId, emailData.id);
    }
    results.push({
      user: user.name, email: user.email, brief_id: briefId,
      sent: emailRes.ok, resend_id: emailData.id || null,
    });
  }

  return { compiled: true, date, results };
}

api.get('/run-morning-brief', apiKeyAuth(), async (c) => {
  const date = c.req.query('date') || new Date().toISOString().slice(0, 10);
  const result = await runMorningBrief(c.env, date);
  return c.json(result);
});

api.get('/health', (c) => c.json({ status: 'ok', service: 'whale-watcher' }));

export default api;
