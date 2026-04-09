// Auth middleware for Whale Watcher API

/**
 * Extract the agent API key from a request. Supported sources, in priority:
 *   1. `Authorization: Bearer <key>`  (canonical — use this)
 *   2. `X-API-Key: <key>`              (legacy header)
 *   3. `?key=<key>`                    (deprecated — logs a warning; remove after cutover)
 *
 * The canonical bearer path is preferred because `?key=` ends up in URL logs
 * (Cloudflare access logs, any proxy, caller trace logs). Bearer headers don't.
 */
function extractAgentKey(c) {
  const authHeader = c.req.header('Authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return { key: authHeader.slice(7).trim(), source: 'bearer' };
  }
  const xApiKey = c.req.header('X-API-Key');
  if (xApiKey) {
    return { key: xApiKey, source: 'x-api-key' };
  }
  const queryKey = c.req.query('key');
  if (queryKey) {
    return { key: queryKey, source: 'query' };
  }
  return { key: null, source: null };
}

export function apiKeyAuth() {
  return async (c, next) => {
    const { key, source } = extractAgentKey(c);
    if (!key || key !== c.env.AGENT_API_KEY) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (source === 'query') {
      // Deprecation warning — the query-param path will be removed in a
      // follow-up deploy once all callers are migrated to bearer auth.
      console.warn(
        `[auth] deprecated query-param key on ${c.req.method} ${new URL(c.req.url).pathname} ` +
        `from ${c.req.header('CF-Connecting-IP') || 'unknown'} ` +
        `UA=${(c.req.header('User-Agent') || 'unknown').slice(0, 120)}`
      );
    }
    await next();
  };
}

export async function resolveUserToken(c) {
  const token = c.req.query('t');
  if (!token) return null;
  const user = await c.env.DB.prepare(
    'SELECT id, email, name, token FROM users WHERE token = ? AND active = 1'
  ).bind(token).first();
  return user;
}
