// Auth middleware for Whale Watcher API

export function apiKeyAuth() {
  return async (c, next) => {
    const key = c.req.header('X-API-Key') || c.req.query('key');
    if (!key || key !== c.env.AGENT_API_KEY) {
      return c.json({ error: 'Unauthorized' }, 401);
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
