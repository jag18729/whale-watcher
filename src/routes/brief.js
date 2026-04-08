import { Hono } from 'hono';
import { resolveUserToken } from '../middleware/auth.js';
import { getBriefWithWatches, getUserPod } from '../db/queries.js';
import { renderBriefPage } from '../templates/brief-page.js';

const brief = new Hono();

brief.get('/:date', async (c) => {
  // Token is in the query string, so suppress all Referer leakage to any
  // third-party asset (Tailwind CDN, fonts, images) loaded by the page.
  c.header('Referrer-Policy', 'no-referrer');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');

  const user = await resolveUserToken(c);
  if (!user) {
    return c.html('<html><head><meta name="referrer" content="no-referrer"></head><body style="background:#0f1117;color:#f87171;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif"><h1>Invalid or missing token</h1></body></html>', 401);
  }

  const briefDate = c.req.param('date');
  const briefData = await getBriefWithWatches(c.env.DB, briefDate, user.id);
  const pod = await getUserPod(c.env.DB, user.id);

  const html = renderBriefPage({ user, briefDate, brief: briefData, pod });
  return c.html(html);
});

export default brief;
