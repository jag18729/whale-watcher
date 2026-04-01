// D1 query helpers for Whale Watcher

export async function getAllUsersWithPods(db) {
  const users = await db.prepare(
    'SELECT id, email, name, token FROM users WHERE active = 1'
  ).all();

  const results = [];
  for (const user of users.results) {
    const pod = await db.prepare(
      'SELECT ticker, sector FROM pod_tickers WHERE user_id = ? AND removed_at IS NULL ORDER BY sector, ticker'
    ).bind(user.id).all();

    const feedback = await db.prepare(`
      SELECT w.ticker, f.agreement, f.adj_target, f.adj_stop, f.notes, f.created_at
      FROM feedback f
      JOIN watches w ON f.watch_id = w.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC LIMIT 20
    `).bind(user.id).all();

    const podRequests = await db.prepare(
      'SELECT ticker, action FROM pod_requests WHERE user_id = ? AND processed = 0'
    ).bind(user.id).all();

    results.push({
      ...user,
      pod: pod.results,
      recent_feedback: feedback.results,
      pod_requests: podRequests.results,
    });
  }
  return results;
}

export async function storeBrief(db, { id, user_id, brief_date, subject, html, watches }) {
  await db.prepare(
    'INSERT INTO briefs (id, user_id, brief_date, subject, html) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, user_id, brief_date, subject, html).run();

  for (const w of watches) {
    await db.prepare(`
      INSERT INTO watches (id, brief_id, ticker, direction, conviction, entry_price, target_price, stop_price, thesis, is_whale)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(w.id, id, w.ticker, w.direction, w.conviction, w.entry_price, w.target_price, w.stop_price, w.thesis, w.is_whale ? 1 : 0).run();
  }

  return { brief_id: id, watches_count: watches.length };
}

export async function updateBriefResendId(db, briefId, resendId) {
  await db.prepare('UPDATE briefs SET resend_id = ? WHERE id = ?').bind(resendId, briefId).run();
}

export async function getBriefWithWatches(db, briefDate, userId) {
  const brief = await db.prepare(
    'SELECT * FROM briefs WHERE brief_date = ? AND user_id = ?'
  ).bind(briefDate, userId).first();
  if (!brief) return null;

  const watches = await db.prepare(
    'SELECT * FROM watches WHERE brief_id = ? ORDER BY is_whale DESC, conviction'
  ).bind(brief.id).all();

  const feedback = await db.prepare(
    'SELECT * FROM feedback WHERE user_id = ? AND watch_id IN (SELECT id FROM watches WHERE brief_id = ?)'
  ).bind(userId, brief.id).all();

  const feedbackMap = {};
  for (const f of feedback.results) {
    feedbackMap[f.watch_id] = f;
  }

  return {
    ...brief,
    watches: watches.results.map(w => ({ ...w, feedback: feedbackMap[w.id] || null })),
  };
}

export async function submitFeedback(db, userId, feedbackItems) {
  let count = 0;
  for (const item of feedbackItems) {
    await db.prepare(`
      INSERT INTO feedback (id, watch_id, user_id, agreement, adj_target, adj_stop, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(watch_id, user_id) DO UPDATE SET
        agreement = excluded.agreement,
        adj_target = excluded.adj_target,
        adj_stop = excluded.adj_stop,
        notes = excluded.notes,
        created_at = datetime('now')
    `).bind(item.id, item.watch_id, userId, item.agreement, item.adj_target || null, item.adj_stop || null, item.notes || null).run();
    count++;
  }
  return count;
}

export async function submitPodRequest(db, userId, ticker, action) {
  const id = crypto.randomUUID();
  await db.prepare(
    'INSERT INTO pod_requests (id, user_id, ticker, action) VALUES (?, ?, ?, ?)'
  ).bind(id, userId, ticker.toUpperCase(), action).run();
  return id;
}

export async function getUserPod(db, userId) {
  const pod = await db.prepare(
    'SELECT ticker, sector FROM pod_tickers WHERE user_id = ? AND removed_at IS NULL ORDER BY sector, ticker'
  ).bind(userId).all();
  return pod.results;
}

export async function upsertResearchCache(db, { date, section, data }) {
  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO research_cache (id, cache_date, section, data)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(cache_date, section) DO UPDATE SET
      data = excluded.data, created_at = datetime('now')
  `).bind(id, date, section, typeof data === 'string' ? data : JSON.stringify(data)).run();
}

export async function getResearchCache(db, date) {
  const rows = await db.prepare(
    'SELECT section, data, created_at FROM research_cache WHERE cache_date = ? ORDER BY section'
  ).bind(date).all();
  const result = {};
  for (const row of rows.results) {
    try { result[row.section] = JSON.parse(row.data); } catch { result[row.section] = row.data; }
  }
  return result;
}

export async function storeEngagement(db, resendId, eventType, payload) {
  const id = crypto.randomUUID();
  await db.prepare(
    'INSERT INTO engagement (id, resend_id, event_type, payload) VALUES (?, ?, ?, ?)'
  ).bind(id, resendId, eventType, JSON.stringify(payload)).run();
}
