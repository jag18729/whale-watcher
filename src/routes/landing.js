// Public landing page at GET /
// Visible without a token. Serves as a portfolio piece for recruiters and peers.
// If ?t=<token> is present, renders a "Welcome back" banner linking to today's brief.

import { baseStyles } from '../templates/base-styles.js';
import { resolveUserToken } from '../middleware/auth.js';

function escapeText(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export async function landingPage(c) {
  const user = await resolveUserToken(c);
  const today = new Date().toISOString().slice(0, 10);

  const welcomeBanner = user ? `
    <div class="ww-welcome">
      <span class="ww-body">Welcome back, ${escapeText(user.name)}.</span>
      <a href="/brief/${today}?t=${encodeURIComponent(user.token)}" class="ww-button ww-button--primary">Today's brief</a>
    </div>
  ` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="referrer" content="no-referrer">
  <meta name="color-scheme" content="light">
  <meta name="description" content="Personalized morning brief newsletter for self-directed investors. Built as a single Cloudflare Worker.">
  <meta property="og:title" content="Whale Watcher">
  <meta property="og:description" content="Personalized market briefs, built to run themselves.">
  <meta property="og:url" content="https://ww.vandine.us">
  <meta property="og:type" content="website">
  <title>Whale Watcher</title>
  ${baseStyles()}
  <style>
    .ww-hero {
      padding: 6rem 0 4rem;
      text-align: center;
    }
    .ww-hero .ww-display {
      font-size: clamp(3.5rem, 11vw, 7rem);
      font-weight: 900;
      font-variation-settings: "opsz" 144, "SOFT" 30;
      letter-spacing: -0.035em;
    }
    .ww-hero__sub {
      font-family: var(--font-display);
      font-style: italic;
      font-weight: 400;
      font-size: clamp(1.1rem, 3vw, 1.4rem);
      color: color-mix(in srgb, var(--ink) 65%, transparent);
      margin-top: 0.6rem;
    }
    .ww-hero__sonar {
      display: inline-block;
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 0.4em;
      color: var(--tide);
      vertical-align: middle;
      letter-spacing: 0.05em;
      margin-left: 0.15em;
    }
    .ww-welcome {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
      padding: 1rem 1.5rem;
      margin: -2rem auto 2rem;
      max-width: 32rem;
      border: 1px solid var(--signal);
      background: color-mix(in srgb, var(--signal) 8%, var(--paper));
    }

    /* Plates */
    .ww-landing-plate {
      padding: 3rem 0;
    }
    .ww-landing-plate + .ww-landing-plate {
      border-top: var(--rule);
    }
    .ww-landing-cols {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2rem;
    }
    @media (min-width: 700px) {
      .ww-landing-cols { grid-template-columns: 1fr 1fr; }
    }
    @media (min-width: 960px) {
      .ww-landing-cols--3 { grid-template-columns: 1fr 1fr 1fr; }
    }
    .ww-landing-plate .ww-body {
      max-width: 44rem;
      color: color-mix(in srgb, var(--ink) 80%, transparent);
    }
    .ww-landing-plate .ww-body strong {
      color: var(--ink);
      font-weight: 600;
    }

    /* Stack badges */
    .ww-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
      margin-top: 1.5rem;
    }
    .ww-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.8rem;
      border: 1px solid var(--tide);
      font-family: var(--font-mono);
      font-size: 0.78rem;
      color: var(--ink);
      letter-spacing: 0.02em;
    }

    /* Feature list */
    .ww-features {
      list-style: none;
      padding: 0;
      margin: 1.5rem 0 0;
    }
    .ww-features li {
      padding: 0.7rem 0;
      border-bottom: var(--rule);
      display: flex;
      gap: 1rem;
      align-items: baseline;
    }
    .ww-features li:last-child { border-bottom: none; }
    .ww-features__label {
      font-family: var(--font-display);
      font-feature-settings: "smcp";
      text-transform: lowercase;
      letter-spacing: 0.14em;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--tide);
      min-width: 8rem;
      flex-shrink: 0;
    }

    /* Specimen brief */
    .ww-specimen {
      border: 1px solid var(--tide);
      padding: 2rem;
      position: relative;
      overflow: hidden;
    }
    .ww-specimen::before {
      content: "SPECIMEN";
      position: absolute;
      top: 0.6rem;
      right: 0.8rem;
      font-family: var(--font-display);
      font-feature-settings: "smcp";
      text-transform: lowercase;
      letter-spacing: 0.2em;
      font-size: 0.65rem;
      color: var(--rust);
      font-weight: 600;
    }
    .ww-specimen__subject {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1.15rem;
      margin-bottom: 0.75rem;
    }
    .ww-specimen__ticker {
      font-family: var(--font-mono);
      font-size: 2.2rem;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 0.4rem;
    }
    .ww-specimen__row {
      display: flex;
      justify-content: space-between;
      padding: 0.4rem 0;
      border-bottom: 1px solid color-mix(in srgb, var(--tide) 20%, transparent);
      font-family: var(--font-mono);
      font-size: 0.88rem;
    }

    /* Links section */
    .ww-links {
      list-style: none;
      padding: 0;
      margin: 1rem 0 0;
    }
    .ww-links li {
      padding: 0.5rem 0;
    }
    .ww-links a {
      color: var(--tide);
      text-decoration: underline;
      text-underline-offset: 3px;
      font-family: var(--font-display);
      font-weight: 500;
      transition: color 180ms;
    }
    .ww-links a:hover { color: var(--ink); }
    .ww-links__desc {
      color: color-mix(in srgb, var(--ink) 55%, transparent);
      font-size: 0.92rem;
      margin-left: 0.25rem;
    }

    .ww-landing-footer {
      padding: 3rem 0 4rem;
      border-top: var(--rule-strong);
      text-align: center;
      margin-top: 2rem;
    }
    .ww-landing-footer a {
      color: var(--tide);
      text-decoration: underline;
      text-underline-offset: 3px;
    }
  </style>
</head>
<body>
  <div class="ww-page">

    <section class="ww-hero">
      <h1 class="ww-display">WHALE WATCHER<span class="ww-hero__sonar">)))</span></h1>
      <p class="ww-hero__sub">A private market dispatch from the open ocean</p>
    </section>

    ${welcomeBanner}

    <div class="ww-isobath" aria-hidden="true"></div>

    <!-- PLATE I: What it does -->
    <section class="ww-landing-plate">
      <div class="ww-caption">PLATE I &middot; WHAT IT DOES</div>
      <div class="ww-landing-cols" style="margin-top:1.25rem">
        <div>
          <p class="ww-body">
            <strong>A personalized morning brief for self-directed investors.</strong>
            Each subscriber maintains a watchlist of tickers called a "pod." Every weekday at 06:00 PT, the Worker fetches current prices, pulls market headlines, and builds a per-user email with conviction-rated picks, a spotlight "whale" (the day's biggest mover), and an interactive feedback page.
          </p>
        </div>
        <div>
          <ul class="ww-features">
            <li><span class="ww-features__label">morning brief</span> <span class="ww-body">Automated daily email with prices, headlines, and picks</span></li>
            <li><span class="ww-features__label">whale of the day</span> <span class="ww-body">Spotlight on the largest absolute mover in any pod</span></li>
            <li><span class="ww-features__label">conviction gauge</span> <span class="ww-body">High / medium / low / hold, derived from price action</span></li>
            <li><span class="ww-features__label">feedback loop</span> <span class="ww-body">Agree, disagree, adjust targets, tune the pod</span></li>
            <li><span class="ww-features__label">zero servers</span> <span class="ww-body">Runs entirely on Cloudflare's edge, scheduled by cron triggers</span></li>
          </ul>
        </div>
      </div>
    </section>

    <!-- PLATE II: The stack -->
    <section class="ww-landing-plate">
      <div class="ww-caption">PLATE II &middot; THE INSTRUMENT</div>
      <div class="ww-landing-cols" style="margin-top:1.25rem">
        <div>
          <p class="ww-body">
            <strong>A single Cloudflare Worker does everything.</strong>
            Scheduling, data collection, brief rendering, email delivery, and feedback collection all run in one deployment. D1 (SQLite on the edge) stores users, pods, briefs, watches, and feedback. No build step, no framework, no runtime to manage. Bun 1.3 for local development, Hono for routing.
          </p>
          <div class="ww-badges">
            <span class="ww-badge">Cloudflare Workers</span>
            <span class="ww-badge">Cloudflare D1</span>
            <span class="ww-badge">Hono</span>
            <span class="ww-badge">Bun 1.3</span>
            <span class="ww-badge">Resend</span>
            <span class="ww-badge">Yahoo Finance</span>
            <span class="ww-badge">Brave Search</span>
          </div>
        </div>
        <div>
          <p class="ww-body">
            <strong>Design: bathythermograph editorial.</strong>
            Hand-written CSS design system with Fraunces serif and IBM Plex Mono. Aged chart-paper texture, conviction gauge animations, sonar-ping load effect, and isobath contour dividers. WCAG 2.1 AA accessible, mobile-first, no Tailwind.
          </p>
        </div>
      </div>
    </section>

    <!-- PLATE III: Specimen brief -->
    <section class="ww-landing-plate">
      <div class="ww-caption">PLATE III &middot; A SPECIMEN BRIEF</div>
      <div class="ww-landing-cols" style="margin-top:1.25rem">
        <div class="ww-specimen">
          <div class="ww-specimen__subject">Whale Watcher &mdash; Wed, Apr 9 &mdash; TSLA down 3.87% leads the pod</div>
          <div class="ww-specimen__ticker" style="color:var(--rust)">TSLA</div>
          <div style="margin-bottom:1rem">
            <span class="ww-gauge ww-gauge--high">high<span class="ww-gauge__bar"></span></span>
            <span class="ww-direction ww-direction--dive" style="margin-left:0.75rem">dive</span>
          </div>
          <div class="ww-specimen__row"><span>AAPL</span><span style="color:var(--kelp)">+1.24%</span></div>
          <div class="ww-specimen__row"><span>NVDA</span><span style="color:var(--rust)">-2.15%</span></div>
          <div class="ww-specimen__row"><span>META</span><span style="color:var(--kelp)">+0.87%</span></div>
          <div class="ww-specimen__row"><span>BTC</span><span style="color:var(--rust)">-0.41%</span></div>
          <div class="ww-specimen__row"><span>CVX</span><span style="color:var(--kelp)">+1.89%</span></div>
        </div>
        <div>
          <p class="ww-body" style="margin-bottom:1.5rem">
            Each morning, subscribers receive an email like this with their personal watchlist, conviction-rated picks, and a "Review &amp; Tune" link to an interactive feedback page. The whale is the day's largest absolute mover from any pod.
          </p>
          <p class="ww-body">
            The feedback page lets subscribers agree or disagree with each pick, adjust target and stop prices, and add or remove tickers from their pod. Changes are applied immediately.
          </p>
        </div>
      </div>
    </section>

    <!-- PLATE IV: Field notes -->
    <section class="ww-landing-plate">
      <div class="ww-caption">PLATE IV &middot; FIELD NOTES</div>
      <ul class="ww-links" style="margin-top:1.25rem">
        <li><a href="https://github.com/jag18729/whale-watcher">GitHub repository</a> <span class="ww-links__desc">&mdash; source, CI/CD, contributing guide</span></li>
        <li><a href="https://github.com/jag18729/whale-watcher/blob/master/docs/ARCHITECTURE.md">Architecture</a> <span class="ww-links__desc">&mdash; system diagrams, design rationale, decision log</span></li>
        <li><a href="https://github.com/jag18729/whale-watcher/blob/master/docs/API.md">API reference</a> <span class="ww-links__desc">&mdash; endpoints, auth, request/response shapes</span></li>
        <li><a href="https://github.com/jag18729/whale-watcher/blob/master/docs/DEPLOY.md">Deployment runbook</a> <span class="ww-links__desc">&mdash; first-time setup, day-to-day operations</span></li>
        <li><a href="https://github.com/jag18729/whale-watcher/blob/master/CHANGELOG.md">Changelog</a> <span class="ww-links__desc">&mdash; version history</span></li>
      </ul>
    </section>

    <footer class="ww-landing-footer">
      <p class="ww-caption" style="margin-bottom:0.5rem">Rafael Garcia &middot; <a href="https://github.com/jag18729">jag18729</a> &middot; MIT License</p>
      <p class="ww-disclaimer">Not financial advice. Do your own research.</p>
    </footer>

  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
