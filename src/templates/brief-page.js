// Token-authenticated feedback page rendered at /brief/:date.
// Bathythermograph editorial aesthetic, mobile-first plates layout.
// All interactive state lives on the DOM via data-* attributes; the client
// script uses event delegation and never touches className strings.

import { baseStyles } from './base-styles.js';

// HTML escapers used wherever user-controlled values flow into the page.
function escapeText(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
function escapeAttr(s) { return escapeText(s); }

// Format a YYYY-MM-DD into "08 APR 2026" for the masthead byline.
function formatDate(iso) {
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const d = new Date(iso + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getUTCDate()).padStart(2,'0')} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Format a price for display. Drops trailing zeros, comma-separates the integer.
function fmtPrice(p) {
  if (p == null || p === '') return '--';
  const n = Number(p);
  if (!Number.isFinite(n)) return String(p);
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format a percent change with sign for display.
function fmtChange(p) {
  if (p == null) return '';
  const n = Number(p);
  if (!Number.isFinite(n)) return '';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

// =============================================================================
// Hero whale plate -- inverted abyss section, the visual center of the page.
// =============================================================================
function whalePlate(w) {
  const conviction = (w.conviction || 'hold').toLowerCase();
  const direction = (w.direction || 'surface').toLowerCase();
  return `
    <section class="ww-whale ww-abyss">
      <div class="ww-whale__inner">
        <span class="ww-sonar" aria-hidden="true"></span>
        <div class="ww-caption">PLATE I &middot; TODAY'S WHALE</div>
        <div class="ww-whale__ticker ww-display ww-mono">${escapeText(w.ticker)}</div>
        <div class="ww-whale__meta">
          <span class="ww-direction ww-direction--${direction}">${direction === 'surface' ? 'surface' : 'dive'}</span>
          <span class="ww-gauge ww-gauge--${conviction}">
            ${conviction}
            <span class="ww-gauge__bar"></span>
          </span>
        </div>
        ${w.thesis ? `<p class="ww-whale__thesis ww-body">${escapeText(w.thesis)}</p>` : ''}
        <div class="ww-readout">
          <div class="ww-readout__cell">
            <div class="ww-caption">entry</div>
            <div class="ww-readout__val ww-mono">${w.entry_price != null ? '$' + fmtPrice(w.entry_price) : '--'}</div>
          </div>
          <div class="ww-readout__cell">
            <div class="ww-caption">target</div>
            <div class="ww-readout__val ww-mono">${w.target_price != null ? '$' + fmtPrice(w.target_price) : '--'}</div>
          </div>
          <div class="ww-readout__cell">
            <div class="ww-caption">stop</div>
            <div class="ww-readout__val ww-mono">${w.stop_price != null ? '$' + fmtPrice(w.stop_price) : '--'}</div>
          </div>
        </div>
        ${watchControls(w, true)}
      </div>
    </section>
  `;
}

// =============================================================================
// Watch row -- one per non-whale watch in Plate II. Tap to expand the drawer.
// =============================================================================
function watchRow(w, idx) {
  const conviction = (w.conviction || 'hold').toLowerCase();
  const direction = (w.direction || 'surface').toLowerCase();
  const stagger = `style="animation-delay: ${(idx * 60)}ms"`;
  return `
    <article class="ww-watch ww-tide-in" data-watch-id="${escapeAttr(w.id)}" data-expanded="false" ${stagger}>
      <button type="button" class="ww-watch__head" data-action="toggle-drawer" aria-expanded="false" aria-controls="drawer-${escapeAttr(w.id)}" aria-label="${escapeAttr(w.ticker)} -- tap to expand details">
        <span class="ww-watch__ticker ww-mono">${escapeText(w.ticker)}</span>
        <span class="ww-watch__center">
          <span class="ww-direction ww-direction--${direction}">${direction}</span>
          <span class="ww-gauge ww-gauge--${conviction}">${conviction}<span class="ww-gauge__bar"></span></span>
        </span>
        <span class="ww-watch__price ww-mono">
          ${w.entry_price != null ? '$' + fmtPrice(w.entry_price) : ''}
        </span>
        <span class="ww-watch__chev" aria-hidden="true">&#x25BE;</span>
      </button>
      <div class="ww-drawer" id="drawer-${escapeAttr(w.id)}" role="region" aria-label="${escapeAttr(w.ticker)} details">
        ${w.thesis ? `<p class="ww-body ww-drawer__thesis">${escapeText(w.thesis)}</p>` : ''}
        <div class="ww-readout">
          <div class="ww-readout__cell"><div class="ww-caption">entry</div><div class="ww-readout__val ww-mono">${w.entry_price != null ? '$' + fmtPrice(w.entry_price) : '--'}</div></div>
          <div class="ww-readout__cell"><div class="ww-caption">target</div><div class="ww-readout__val ww-mono">${w.target_price != null ? '$' + fmtPrice(w.target_price) : '--'}</div></div>
          <div class="ww-readout__cell"><div class="ww-caption">stop</div><div class="ww-readout__val ww-mono">${w.stop_price != null ? '$' + fmtPrice(w.stop_price) : '--'}</div></div>
        </div>
        ${watchControls(w, false)}
      </div>
    </article>
  `;
}

// =============================================================================
// Agree/disagree + adjust controls. Reused by whalePlate and watchRow drawer.
// =============================================================================
function watchControls(w, isWhale) {
  const existing = w.feedback?.agreement || '';
  const initialTarget = w.feedback?.adj_target ?? '';
  const initialStop = w.feedback?.adj_stop ?? '';
  const initialNotes = w.feedback?.notes ?? '';
  return `
    <div class="ww-controls" data-watch="${escapeAttr(w.id)}">
      <div class="ww-controls__row">
        <button type="button" class="ww-button" data-action="agree" data-watch="${escapeAttr(w.id)}" data-val="agree" data-state="${existing === 'agree' ? 'on' : 'off'}">Agree</button>
        <button type="button" class="ww-button" data-action="disagree" data-watch="${escapeAttr(w.id)}" data-val="disagree" data-state="${existing === 'disagree' ? 'on' : 'off'}">Disagree</button>
      </div>
      <div class="ww-controls__fields">
        <label class="ww-field">
          <span class="ww-caption">adj. target</span>
          <input type="number" step="0.01" inputmode="decimal" class="ww-input" data-field="adj_target" data-watch="${escapeAttr(w.id)}" data-initial="${escapeAttr(initialTarget)}" value="${escapeAttr(initialTarget)}">
        </label>
        <label class="ww-field">
          <span class="ww-caption">adj. stop</span>
          <input type="number" step="0.01" inputmode="decimal" class="ww-input" data-field="adj_stop" data-watch="${escapeAttr(w.id)}" data-initial="${escapeAttr(initialStop)}" value="${escapeAttr(initialStop)}">
        </label>
        <label class="ww-field ww-field--full">
          <span class="ww-caption">field notes</span>
          <textarea class="ww-input ww-textarea" rows="2" data-field="notes" data-watch="${escapeAttr(w.id)}" data-initial="${escapeAttr(initialNotes)}">${escapeText(initialNotes)}</textarea>
        </label>
      </div>
    </div>
  `;
}

function podTag(p) {
  const t = escapeText(p.ticker);
  return `
    <span class="ww-tag">
      <span>${t}</span>
      <button type="button" class="ww-tag__close" data-action="pod-remove" data-ticker="${escapeAttr(p.ticker)}" aria-label="Remove ${escapeAttr(p.ticker)}">&times;</button>
    </span>
  `;
}

function noBriefState(date) {
  return `
    <section class="ww-plate ww-empty">
      <div class="ww-caption">PLATE I &middot; NO DISPATCH</div>
      <h2 class="ww-plate__title">No brief for ${escapeText(date)}.</h2>
      <p class="ww-body">The Worker has not delivered a dispatch for this date yet. Briefs run weekdays at 06:00 PT. If today is a weekday and it is past that time, the upstream price feed may be cold.</p>
    </section>
  `;
}

// =============================================================================
// Page render
// =============================================================================
export function renderBriefPage({ user, briefDate, brief, pod }) {
  const watches = brief?.watches || [];
  const whale = watches.find(w => w.is_whale);
  const others = watches.filter(w => !w.is_whale);
  const dateLabel = formatDate(briefDate);
  const userLabel = (user.name || 'subscriber').toUpperCase();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="referrer" content="no-referrer">
  <meta name="color-scheme" content="light">
  <title>Whale Watcher &middot; ${escapeText(briefDate)}</title>
  ${baseStyles()}
  <style>
    /* ===== Whale hero plate ===== */
    .ww-whale { margin: 1.5rem -1.5rem 2.5rem; padding: 2.75rem 1.5rem 2.5rem; }
    @media (min-width: 840px) { .ww-whale { margin: 1.5rem -3rem 3rem; padding: 3.5rem 3rem 3rem; } }
    .ww-whale__inner { max-width: 60rem; margin: 0 auto; position: relative; }
    .ww-whale .ww-sonar { top: 4.5rem; left: 1rem; }
    .ww-whale__ticker {
      font-size: clamp(3rem, 12vw, 5.5rem);
      line-height: 0.95;
      margin: 0.4rem 0 1rem;
      letter-spacing: -0.03em;
      font-weight: 700;
      color: var(--paper);
      font-feature-settings: "tnum";
    }
    .ww-whale__meta {
      display: flex; gap: 1.25rem; align-items: center;
      margin-bottom: 1.25rem;
    }
    .ww-whale__thesis {
      font-size: 1.05rem;
      max-width: 48rem;
      color: color-mix(in srgb, var(--paper) 86%, transparent);
      margin: 0 0 1.5rem;
    }

    /* ===== Three-column readout (entry / target / stop) ===== */
    .ww-readout {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0;
      border-top: 1px solid color-mix(in srgb, var(--paper) 25%, transparent);
      border-bottom: 1px solid color-mix(in srgb, var(--paper) 25%, transparent);
      margin: 0.5rem 0 1.75rem;
    }
    .ww-readout__cell {
      padding: 0.85rem 1rem;
      border-right: 1px solid color-mix(in srgb, var(--paper) 18%, transparent);
    }
    .ww-readout__cell:last-child { border-right: none; }
    .ww-readout__val {
      font-size: 1.35rem;
      margin-top: 0.15rem;
      color: var(--paper);
      font-feature-settings: "tnum";
    }
    /* In light (paper) sections the readout uses ink dividers instead. */
    .ww-drawer .ww-readout {
      border-top-color: color-mix(in srgb, var(--tide) 30%, transparent);
      border-bottom-color: color-mix(in srgb, var(--tide) 30%, transparent);
      margin: 0.4rem 0 1.25rem;
    }
    .ww-drawer .ww-readout__cell {
      border-right-color: color-mix(in srgb, var(--tide) 18%, transparent);
    }
    .ww-drawer .ww-readout__val { color: var(--ink); }

    /* ===== Watches list (Plate II) ===== */
    .ww-watches {
      border-top: var(--rule);
    }
    .ww-watch {
      border-bottom: var(--rule);
    }
    .ww-watch__head {
      display: grid;
      grid-template-columns: 4.5rem 1fr auto 1.5rem;
      gap: 0.75rem;
      align-items: center;
      width: 100%;
      padding: 1.1rem 0.25rem;
      background: transparent;
      border: none;
      color: inherit;
      cursor: pointer;
      text-align: left;
      font: inherit;
      transition: background-color var(--m-button);
    }
    .ww-watch__head:hover {
      background: color-mix(in srgb, var(--tide) 5%, transparent);
    }
    .ww-watch__ticker {
      font-size: 1.1rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .ww-watch__center {
      display: flex;
      gap: 0.85rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .ww-watch__price {
      font-size: 0.98rem;
      color: color-mix(in srgb, var(--ink) 70%, transparent);
      text-align: right;
    }
    .ww-watch__chev {
      font-family: var(--font-mono);
      font-size: 1.3rem;
      color: var(--tide);
      transition: transform var(--m-button) ease;
      text-align: center;
    }
    .ww-watch[data-expanded="true"] .ww-watch__chev { transform: rotate(45deg); }
    .ww-watch__head:focus-visible { outline: 2px solid var(--signal); outline-offset: 2px; }

    .ww-drawer {
      max-height: 0;
      overflow: hidden;
      transition: max-height 280ms cubic-bezier(0.2, 0.7, 0.2, 1);
    }
    .ww-watch[data-expanded="true"] .ww-drawer {
      max-height: 60rem;
    }
    .ww-drawer__thesis {
      margin: 0.25rem 0 1rem;
      color: color-mix(in srgb, var(--ink) 80%, transparent);
      font-size: 0.98rem;
    }

    /* ===== Controls (agree/disagree + fields) ===== */
    .ww-controls { padding: 0.5rem 0 1.25rem; }
    .ww-controls__row {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .ww-controls__row .ww-button {
      flex: 1;
      max-width: 14rem;
    }
    .ww-controls__fields {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.85rem 1.25rem;
    }
    .ww-field { display: flex; flex-direction: column; gap: 0.25rem; }
    .ww-field--full { grid-column: 1 / -1; }
    .ww-textarea { resize: vertical; min-height: 2.5rem; }

    /* The whale plate's controls live on the dark abyss background, so we
       need to soften the input underline color to read on dark. */
    .ww-whale .ww-controls .ww-input {
      border-bottom-color: color-mix(in srgb, var(--paper) 40%, transparent);
      color: var(--paper);
    }
    .ww-whale .ww-controls .ww-input::placeholder {
      color: color-mix(in srgb, var(--paper) 35%, transparent);
    }
    .ww-whale .ww-controls .ww-input:focus { border-bottom-color: var(--signal); }
    .ww-whale .ww-controls .ww-button {
      border-color: var(--paper);
      color: var(--paper);
    }
    .ww-whale .ww-controls .ww-button[data-state="on"][data-val="agree"]    { background: var(--kelp); border-color: var(--kelp); color: var(--paper); }
    .ww-whale .ww-controls .ww-button[data-state="on"][data-val="disagree"] { background: var(--rust); border-color: var(--rust); color: var(--paper); }
    .ww-whale .ww-controls .ww-caption { color: color-mix(in srgb, var(--signal) 70%, transparent); }

    /* ===== Empty state ===== */
    .ww-empty .ww-plate__title { margin: 0.5rem 0 1rem; }

    /* ===== Save flash slot in masthead ===== */
    .ww-masthead__row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
    }

    /* ===== HCI: tap confirmation pulse on agree/disagree ===== */
    @keyframes ww-tap-pulse {
      0%   { transform: scale(1); }
      40%  { transform: scale(1.06); }
      100% { transform: scale(1); }
    }
    .ww-button[data-val][data-state="on"] {
      animation: ww-tap-pulse 200ms cubic-bezier(0.2, 0.7, 0.2, 1);
    }

    /* ===== HCI: flash message fade-out ===== */
    .ww-flash {
      transition: opacity 400ms ease;
    }
    .ww-flash[data-fading="true"] {
      opacity: 0;
    }

    /* ===== HCI: chevron rotation on expand (down -> up) ===== */
    .ww-watch[data-expanded="true"] .ww-watch__chev {
      transform: rotate(180deg);
    }

    /* ===== HCI: skip-link for keyboard users ===== */
    .ww-skip {
      position: absolute;
      left: -9999px;
      top: auto;
      width: 1px;
      height: 1px;
      overflow: hidden;
      z-index: 100;
    }
    .ww-skip:focus {
      position: fixed;
      top: 0.75rem;
      left: 0.75rem;
      width: auto;
      height: auto;
      padding: 0.7rem 1.2rem;
      background: var(--ink);
      color: var(--paper);
      font-family: var(--font-display);
      font-size: 0.95rem;
      z-index: 1000;
    }
  </style>
</head>
<body>
  <a href="#watches" class="ww-skip">Skip to watches</a>
  <div class="ww-page">

    <header class="ww-masthead">
      <div class="ww-masthead__row">
        <span class="ww-caption">${escapeText(dateLabel)} &middot; dispatch for ${escapeText(userLabel)}</span>
        <span class="ww-flash" id="save-flash" data-tone="" role="status" aria-live="polite"></span>
      </div>
      <h1 class="ww-display">WHALE WATCHER</h1>
    </header>
    <hr class="ww-rule ww-rule--strong">

    ${!brief ? noBriefState(briefDate) : `
      ${whale ? whalePlate(whale) : ''}

      ${others.length ? `
        <section class="ww-plate">
          <div class="ww-plate__head">
            <span class="ww-caption">PLATE II &middot; watches (${others.length})</span>
          </div>
          <div class="ww-watches" id="watches">
            ${others.map((w, i) => watchRow(w, i)).join('')}
          </div>
        </section>
      ` : ''}
    `}

    <div class="ww-isobath" aria-hidden="true"></div>

    <section class="ww-plate">
      <div class="ww-plate__head">
        <span class="ww-caption">PLATE III &middot; pod composition</span>
      </div>
      <div class="ww-pod-tags" id="pod-tags">
        ${pod.map(podTag).join('')}
      </div>
      <div class="ww-pod-add">
        <input id="add-ticker" class="ww-input" type="text" placeholder="add ticker..." maxlength="10" autocomplete="off">
        <button id="pod-add-btn" class="ww-button" type="button">Add</button>
      </div>
    </section>

    <footer class="ww-footer">
      <span class="ww-caption">surface = bullish &middot; dive = bearish &middot; whale = day's largest absolute mover</span>
      <p class="ww-disclaimer">Not financial advice. Do your own research.</p>
    </footer>

  </div>

  <div class="ww-submit-bar" id="submit-bar" data-active="false" aria-live="polite">
    <span class="ww-submit-bar__count" id="submit-count">no changes pending</span>
    <button class="ww-button ww-button--primary" id="submit-btn" type="button">Submit feedback</button>
  </div>

  <script>
    (function () {
      var TOKEN = new URLSearchParams(location.search).get('t') || '';
      var agreements = {};

      // Seed agreements from any pre-existing data-state="on" buttons (server-rendered).
      document.querySelectorAll('.ww-button[data-state="on"][data-watch]').forEach(function (btn) {
        agreements[btn.dataset.watch] = btn.dataset.val;
      });

      var flashTimer = null;
      function flash(msg, tone) {
        var el = document.getElementById('save-flash');
        if (!el) return;
        el.textContent = msg;
        el.dataset.tone = tone || '';
        el.dataset.fading = 'false';
        // Auto-clear after 5 seconds so stale messages don't persist.
        clearTimeout(flashTimer);
        flashTimer = setTimeout(function () {
          el.dataset.fading = 'true';
          setTimeout(function () {
            el.textContent = '';
            el.dataset.tone = '';
            el.dataset.fading = 'false';
          }, 400);
        }, 5000);
      }

      function setAgreement(watchId, val) {
        // Toggle: clicking the same value clears it.
        var current = agreements[watchId];
        var next = current === val ? null : val;
        if (next === null) {
          delete agreements[watchId];
        } else {
          agreements[watchId] = next;
        }
        document.querySelectorAll('.ww-button[data-watch="' + cssEscape(watchId) + '"]').forEach(function (btn) {
          btn.dataset.state = (btn.dataset.val === next) ? 'on' : 'off';
        });
        updateSubmitBar();
      }

      // Minimal CSS.escape polyfill for older browsers.
      function cssEscape(s) {
        if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(s);
        return String(s).replace(/[^a-zA-Z0-9_-]/g, function (c) { return '\\\\' + c; });
      }

      function toggleDrawer(watchEl) {
        var open = watchEl.dataset.expanded === 'true';
        var next = open ? 'false' : 'true';
        watchEl.dataset.expanded = next;
        // Sync aria-expanded on the toggle button for screen readers.
        var btn = watchEl.querySelector('[data-action="toggle-drawer"]');
        if (btn) btn.setAttribute('aria-expanded', next);
        // On open, focus the first interactive element in the drawer so
        // keyboard users land inside it without extra Tab presses.
        if (next === 'true') {
          var first = watchEl.querySelector('.ww-drawer .ww-button, .ww-drawer .ww-input');
          if (first) setTimeout(function () { first.focus(); }, 100);
        }
      }

      function isFieldDirty(input) {
        return (input.value || '') !== (input.dataset.initial || '');
      }

      function countDirty() {
        var dirty = new Set(Object.keys(agreements));
        document.querySelectorAll('[data-field][data-watch]').forEach(function (input) {
          if (isFieldDirty(input)) dirty.add(input.dataset.watch);
        });
        return dirty.size;
      }

      function updateSubmitBar() {
        var n = countDirty();
        var bar = document.getElementById('submit-bar');
        var count = document.getElementById('submit-count');
        bar.dataset.active = n > 0 ? 'true' : 'false';
        if (n === 0) count.textContent = 'no changes pending';
        else if (n === 1) count.textContent = '1 change pending';
        else count.textContent = n + ' changes pending';
      }

      // ===== Event delegation =====
      document.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action]');
        if (btn) {
          var act = btn.dataset.action;
          if (act === 'agree' || act === 'disagree') {
            e.preventDefault(); e.stopPropagation();
            setAgreement(btn.dataset.watch, btn.dataset.val);
            return;
          }
          if (act === 'pod-remove') {
            e.preventDefault();
            podAction(btn.dataset.ticker, 'remove');
            return;
          }
          if (act === 'toggle-drawer') {
            // Click on a row head opens or closes the drawer.
            var row = btn.closest('.ww-watch');
            if (row) toggleDrawer(row);
            return;
          }
        }
        if (e.target.id === 'pod-add-btn') {
          var input = document.getElementById('add-ticker');
          podAction(input.value, 'add');
          return;
        }
        if (e.target.id === 'submit-btn') {
          submitAll();
          return;
        }
      });

      // Track field input changes for the dirty count.
      document.addEventListener('input', function (e) {
        if (e.target.matches('[data-field][data-watch]')) {
          updateSubmitBar();
        }
      });

      // Add-ticker on Enter.
      document.addEventListener('keydown', function (e) {
        if (e.target && e.target.id === 'add-ticker' && e.key === 'Enter') {
          e.preventDefault();
          podAction(e.target.value, 'add');
        }
      });

      function collectItems() {
        var items = [];
        document.querySelectorAll('[data-watch-id]').forEach(function (card) {
          var watchId = card.dataset.watchId;
          var agreement = agreements[watchId] || null;
          var get = function (field) {
            var el = card.querySelector('[data-field="' + field + '"]');
            if (!el) return null;
            return isFieldDirty(el) ? (el.value || null) : null;
          };
          var adjTarget = get('adj_target');
          var adjStop = get('adj_stop');
          var notes = get('notes');
          if (agreement || adjTarget || adjStop || notes) {
            items.push({
              watch_id: watchId,
              agreement: agreement,
              adj_target: adjTarget ? parseFloat(adjTarget) : null,
              adj_stop: adjStop ? parseFloat(adjStop) : null,
              notes: notes,
            });
          }
        });
        // The whale plate is not wrapped in a [data-watch-id] card, so collect from its controls directly.
        var whaleControls = document.querySelector('.ww-whale .ww-controls');
        if (whaleControls) {
          var watchId = whaleControls.dataset.watch;
          var agreement = agreements[watchId] || null;
          var pickField = function (field) {
            var el = whaleControls.querySelector('[data-field="' + field + '"]');
            if (!el) return null;
            return isFieldDirty(el) ? (el.value || null) : null;
          };
          var adjTarget = pickField('adj_target');
          var adjStop = pickField('adj_stop');
          var notes = pickField('notes');
          if (agreement || adjTarget || adjStop || notes) {
            // Only add if not already in items (the whale is never in [data-watch-id] cards).
            items.push({
              watch_id: watchId,
              agreement: agreement,
              adj_target: adjTarget ? parseFloat(adjTarget) : null,
              adj_stop: adjStop ? parseFloat(adjStop) : null,
              notes: notes,
            });
          }
        }
        return items;
      }

      async function submitAll() {
        var btn = document.getElementById('submit-btn');
        btn.disabled = true;
        var prevText = btn.textContent;
        btn.textContent = 'Submitting...';

        var items = collectItems();
        if (!items.length) {
          flash('nothing to save', 'warn');
          btn.disabled = false; btn.textContent = prevText;
          return;
        }

        try {
          var res = await fetch('/api/feedback?t=' + encodeURIComponent(TOKEN), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: items }),
          });
          var data = await res.json();
          if (res.ok) {
            flash('saved ' + (data.saved || items.length) + ' items', 'ok');
            // After save, refresh the data-initial values so the dirty count resets.
            document.querySelectorAll('[data-field][data-watch]').forEach(function (input) {
              input.dataset.initial = input.value || '';
            });
            updateSubmitBar();
          } else {
            flash(data.error || 'error', 'warn');
          }
        } catch (err) {
          flash('network error', 'warn');
        }

        btn.disabled = false;
        btn.textContent = prevText;
      }

      async function podAction(ticker, action) {
        if (!ticker) return;
        try {
          var res = await fetch('/api/pod?t=' + encodeURIComponent(TOKEN), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker: ticker, action: action }),
          });
          var data = await res.json();
          if (res.ok) {
            flash(action === 'add' ? ticker.toUpperCase() + ' requested' : ticker + ' removal requested', 'ok');
            if (action === 'add') {
              var input = document.getElementById('add-ticker');
              if (input) input.value = '';
            }
          } else {
            flash(data.error || 'error', 'warn');
          }
        } catch (err) {
          flash('network error', 'warn');
        }
      }

      // Initial dirty count based on any pre-set agreements.
      updateSubmitBar();
    })();
  </script>
</body>
</html>`;
}
