// Personal pod dashboard at GET /dashboard?t=<token>
// Token-required. Shows the user's actual pod with live prices, recent briefs,
// and pod management. All data is fetched server-side via the shared
// fetchYahooPrice helper -- no client-side API calls, no exposed keys.

import { baseStyles } from '../templates/base-styles.js';
import { resolveUserToken } from '../middleware/auth.js';
import { getUserPod, getRecentBriefs } from '../db/queries.js';
import { fetchYahooPrice } from './api.js';

function escapeText(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
function escapeAttr(s) { return escapeText(s); }

function fmtPrice(p) {
  if (p == null) return '--';
  const n = Number(p);
  if (!Number.isFinite(n)) return '--';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function dashboardPage(c) {
  c.header('Referrer-Policy', 'no-referrer');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');

  const user = await resolveUserToken(c);
  if (!user) {
    return c.html(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="referrer" content="no-referrer"><title>Whale Watcher</title>${baseStyles()}
<style>.ww-gate{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;gap:1.5rem}</style>
</head><body><div class="ww-page"><div class="ww-gate">
<h1 class="ww-display" style="font-size:clamp(2rem,6vw,3rem)">Station log</h1>
<p class="ww-body" style="color:color-mix(in srgb,var(--ink) 60%,transparent)">This view is private. If you have a link in your inbox, follow it.</p>
<a href="/" class="ww-button">Back to landing</a>
</div></div></body></html>`, 401);
  }

  // Fetch pod, prices, and recent briefs in parallel.
  const pod = await getUserPod(c.env.DB, user.id);
  const tickers = pod.map(p => p.ticker);

  const [priceResults, recentBriefs] = await Promise.all([
    Promise.all(tickers.map(fetchYahooPrice)),
    getRecentBriefs(c.env.DB, user.id, 7),
  ]);

  const prices = {};
  for (const r of priceResults) prices[r.ticker] = r;

  const today = new Date().toISOString().slice(0, 10);
  const dateObj = new Date();
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const dateLabel = `${String(dateObj.getUTCDate()).padStart(2,'0')} ${months[dateObj.getUTCMonth()]} ${dateObj.getUTCFullYear()}`;

  // Group tickers by sector for layout (null sector goes to "other")
  const sectors = {};
  for (const p of pod) {
    const sec = p.sector || 'other';
    if (!sectors[sec]) sectors[sec] = [];
    sectors[sec].push(p.ticker);
  }

  const tickerRow = (t) => {
    const px = prices[t] || {};
    const price = px.price;
    const change = px.change_pct;
    const colorVar = change == null ? '--tide' : (change >= 0 ? '--kelp' : '--rust');
    const sign = change != null && change >= 0 ? '+' : '';
    return `
      <div class="ww-dash-row ww-tide-in">
        <span class="ww-mono ww-dash-row__ticker">${escapeText(t)}</span>
        <span class="ww-mono ww-dash-row__price">${price != null ? '$' + fmtPrice(price) : '--'}</span>
        <span class="ww-mono ww-dash-row__change" style="color:var(${colorVar})">${change != null ? sign + change.toFixed(2) + '%' : ''}</span>
      </div>`;
  };

  const sectorBlock = (name, tickers) => `
    <div class="ww-dash-sector">
      <div class="ww-caption">${escapeText(name)}</div>
      <div class="ww-dash-sector__list">
        ${tickers.map(tickerRow).join('')}
      </div>
    </div>`;

  const briefLink = (b) => `
    <li class="ww-dash-brief">
      <a href="/brief/${escapeAttr(b.brief_date)}?t=${encodeURIComponent(user.token)}" class="ww-dash-brief__link">
        <span class="ww-mono ww-dash-brief__date">${escapeText(b.brief_date)}</span>
        <span class="ww-dash-brief__subject">${escapeText(b.subject)}</span>
      </a>
    </li>`;

  const podTag = (p) => `
    <span class="ww-tag">
      <span>${escapeText(p.ticker)}</span>
      <button type="button" class="ww-tag__close" data-action="pod-remove" data-ticker="${escapeAttr(p.ticker)}" aria-label="Remove ${escapeAttr(p.ticker)}">&times;</button>
    </span>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="referrer" content="no-referrer">
  <meta name="color-scheme" content="light">
  <title>Station Log &middot; ${escapeText(user.name)}</title>
  ${baseStyles()}
  <style>
    .ww-dash-row {
      display: grid;
      grid-template-columns: 5rem 1fr auto;
      gap: 0.5rem;
      align-items: baseline;
      padding: 0.7rem 0.25rem;
      border-bottom: var(--rule);
    }
    .ww-dash-row__ticker { font-weight: 600; font-size: 1rem; }
    .ww-dash-row__price { font-size: 0.95rem; text-align: right; color: var(--ink); }
    .ww-dash-row__change { font-size: 0.88rem; text-align: right; min-width: 5rem; }

    .ww-dash-sector { margin-bottom: 2rem; }
    .ww-dash-sector__list { border-top: var(--rule-strong); }
    .ww-dash-sectors {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
      gap: 1.5rem 2.5rem;
    }

    .ww-dash-brief { list-style: none; }
    .ww-dash-brief__link {
      display: flex;
      gap: 1.25rem;
      align-items: baseline;
      padding: 0.65rem 0;
      border-bottom: var(--rule);
      text-decoration: none;
      color: inherit;
      transition: background 180ms;
    }
    .ww-dash-brief__link:hover { background: color-mix(in srgb, var(--tide) 5%, transparent); }
    .ww-dash-brief__date { font-size: 0.85rem; color: var(--tide); white-space: nowrap; }
    .ww-dash-brief__subject {
      font-family: var(--font-display);
      font-weight: 500;
      font-size: 0.95rem;
      color: var(--ink);
    }
  </style>
</head>
<body>
  <div class="ww-page">

    <header class="ww-masthead">
      <span class="ww-caption">${escapeText(dateLabel)} &middot; ${escapeText(user.name.toUpperCase())}</span>
      <h1 class="ww-display">STATION LOG</h1>
    </header>
    <hr class="ww-rule ww-rule--strong">

    <!-- Today's pod with prices -->
    <section class="ww-plate">
      <div class="ww-plate__head">
        <span class="ww-caption">PLATE I &middot; YOUR POD (${tickers.length} tickers)</span>
        <a href="/brief/${today}?t=${encodeURIComponent(user.token)}" class="ww-button" style="padding:0.4rem 1rem;font-size:0.75rem">Today's brief</a>
      </div>
      <div class="ww-dash-sectors">
        ${Object.entries(sectors).map(([name, ts]) => sectorBlock(name, ts)).join('')}
      </div>
    </section>

    <div class="ww-isobath" aria-hidden="true"></div>

    <!-- Recent briefs -->
    ${recentBriefs.length ? `
    <section class="ww-plate">
      <div class="ww-plate__head">
        <span class="ww-caption">PLATE II &middot; RECENT DISPATCHES</span>
      </div>
      <ul class="ww-links" style="margin:0;padding:0">
        ${recentBriefs.map(briefLink).join('')}
      </ul>
    </section>
    ` : ''}

    <div class="ww-isobath" aria-hidden="true"></div>

    <!-- Pod management -->
    <section class="ww-plate">
      <div class="ww-plate__head">
        <span class="ww-caption">PLATE III &middot; POD COMPOSITION</span>
      </div>
      <div class="ww-pod-tags" id="pod-tags">
        ${pod.map(podTag).join('')}
      </div>
      <div class="ww-pod-add">
        <input id="add-ticker" class="ww-input" type="text" placeholder="add ticker..." maxlength="10" autocomplete="off">
        <button id="pod-add-btn" class="ww-button" type="button">Add</button>
      </div>
      <span class="ww-flash" id="save-flash" data-tone="" role="status" aria-live="polite" style="display:block;margin-top:0.75rem"></span>
    </section>

    <footer class="ww-footer">
      <a href="/" style="color:var(--tide);text-decoration:underline;text-underline-offset:3px;font-family:var(--font-display);font-weight:500">Back to landing</a>
      <p class="ww-disclaimer" style="margin-top:0.75rem">Not financial advice. Do your own research.</p>
    </footer>

  </div>

  <script>
    (function () {
      var TOKEN = new URLSearchParams(location.search).get('t') || '';
      var flashTimer = null;
      function flash(msg, tone) {
        var el = document.getElementById('save-flash');
        if (!el) return;
        el.textContent = msg; el.dataset.tone = tone || '';
        el.dataset.fading = 'false';
        clearTimeout(flashTimer);
        flashTimer = setTimeout(function () {
          el.dataset.fading = 'true';
          setTimeout(function () { el.textContent = ''; el.dataset.tone = ''; el.dataset.fading = 'false'; }, 400);
        }, 5000);
      }

      document.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action]');
        if (btn && btn.dataset.action === 'pod-remove') {
          e.preventDefault();
          podAction(btn.dataset.ticker, 'remove');
          return;
        }
        if (e.target.id === 'pod-add-btn') {
          podAction(document.getElementById('add-ticker').value, 'add');
        }
      });

      document.addEventListener('keydown', function (e) {
        if (e.target && e.target.id === 'add-ticker' && e.key === 'Enter') {
          e.preventDefault();
          podAction(e.target.value, 'add');
        }
      });

      async function podAction(ticker, action) {
        if (!ticker) return;
        ticker = ticker.trim().toUpperCase();
        if (!ticker) return;
        try {
          var res = await fetch('/api/pod?t=' + encodeURIComponent(TOKEN), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker: ticker, action: action }),
          });
          var data = await res.json();
          if (res.ok) {
            flash(action === 'add' ? ticker + ' added to pod' : ticker + ' removed from pod', 'ok');
            var tags = document.getElementById('pod-tags');
            if (action === 'add' && tags) {
              var span = document.createElement('span');
              span.className = 'ww-tag';
              span.innerHTML = '<span>' + ticker + '</span><button type="button" class="ww-tag__close" data-action="pod-remove" data-ticker="' + ticker + '" aria-label="Remove ' + ticker + '">&times;</button>';
              tags.appendChild(span);
              document.getElementById('add-ticker').value = '';
            }
            if (action === 'remove' && tags) {
              var b = tags.querySelector('[data-ticker="' + ticker + '"]');
              if (b) { var t = b.closest('.ww-tag'); if (t) t.remove(); }
            }
          } else {
            flash(data.error || 'error', 'warn');
          }
        } catch (err) { flash('network error', 'warn'); }
      }
    })();
  </script>
</body>
</html>`;

  return c.html(html);
}
