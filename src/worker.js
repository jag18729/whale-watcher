import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { dashboardPage } from './routes/dashboard.js';
import api from './routes/api.js';
import brief from './routes/brief.js';
import webhooks from './routes/webhooks.js';

const app = new Hono();

app.use('*', cors());

// API routes
app.route('/api', api);
app.route('/api/webhooks', webhooks);

// Feedback page
app.route('/brief', brief);

// Dashboard (existing Finnhub viewer)
app.get('/', (c) => dashboardPage(c.env));
app.get('/dashboard', (c) => dashboardPage(c.env));

// Fallback
app.all('*', (c) => c.json({ error: 'Not found' }, 404));

export default app;
