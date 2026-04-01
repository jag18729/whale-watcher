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

// Compile brief: render HTML, send email, store in D1
api.post('/compile-brief', apiKeyAuth(), async (c) => {
  const body = await c.req.json();
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

api.get('/health', (c) => c.json({ status: 'ok', service: 'whale-watcher' }));

export default api;
