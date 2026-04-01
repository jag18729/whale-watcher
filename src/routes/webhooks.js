import { Hono } from 'hono';
import { storeEngagement } from '../db/queries.js';

const webhooks = new Hono();

webhooks.post('/resend', async (c) => {
  const body = await c.req.json();
  const eventType = body.type;

  if (!eventType) {
    return c.json({ error: 'Missing event type' }, 400);
  }

  const resendId = body.data?.email_id || null;
  await storeEngagement(c.env.DB, resendId, eventType, body);
  return c.json({ received: true });
});

export default webhooks;
