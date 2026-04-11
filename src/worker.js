import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { landingPage } from './routes/landing.js';
import { dashboardPage } from './routes/dashboard.js';
import api, { runMorningBrief } from './routes/api.js';
import brief from './routes/brief.js';
import webhooks from './routes/webhooks.js';

const app = new Hono();

app.use('*', cors());

// API routes
app.route('/api', api);
app.route('/api/webhooks', webhooks);

// Feedback page
app.route('/brief', brief);

// Public landing (portfolio piece, no token needed)
app.get('/', (c) => landingPage(c));

// Personal pod dashboard (token-gated)
app.get('/dashboard', (c) => dashboardPage(c));

// Fallback
app.all('*', (c) => c.json({ error: 'Not found' }, 404));

export default {
  fetch: app.fetch,
  // Cloudflare Workers cron trigger. Configured in wrangler.toml under [[triggers]].
  // Runs the morning brief without involving any external scheduler or LLM agent.
  async scheduled(event, env, ctx) {
    const date = new Date().toISOString().slice(0, 10);
    console.log(`[cron] run-morning-brief start date=${date} cron=${event.cron}`);
    try {
      const result = await runMorningBrief(env, date);
      console.log(`[cron] run-morning-brief done sent=${result.results?.length ?? 0}`);
    } catch (err) {
      console.error(`[cron] run-morning-brief failed:`, err.stack || err.message);
    }
  },
};
