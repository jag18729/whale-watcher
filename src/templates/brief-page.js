// Feedback page template for /brief/:date

const DIRECTION_LABELS = { surface: 'Surface (Bullish)', dive: 'Dive (Bearish)' };
const DIRECTION_ICONS = { surface: '<span class="text-green-400">&#x25B2;</span>', dive: '<span class="text-red-400">&#x25BC;</span>' };
const CONVICTION_STYLES = {
  high:   'background:#064e3b;color:#34d399',
  medium: 'background:#713f12;color:#fbbf24',
  low:    'background:#7f1d1d;color:#f87171',
  hold:   'background:#1e293b;color:#94a3b8',
};

// HTML escapers used wherever user-controlled values flow into the page.
// Tickers like "BRK.A" are safe today but the schema doesn't enforce that.
function escapeText(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
function escapeAttr(s) { return escapeText(s); }

function watchCard(w, index) {
  const dirIcon = DIRECTION_ICONS[w.direction] || '';
  const convStyle = CONVICTION_STYLES[w.conviction] || CONVICTION_STYLES.hold;
  const existingAgreement = w.feedback?.agreement || '';

  return `
    <div class="bg-[#1c1f2e] rounded-lg p-5 border border-[#2d3248] ${w.is_whale ? 'ring-2 ring-blue-500/50' : ''}" data-watch-id="${escapeAttr(w.id)}">
      ${w.is_whale ? '<div class="text-xs text-blue-400 font-semibold mb-2">TODAY\'S WHALE</div>' : ''}
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-3">
          <span class="font-mono text-xl font-bold text-white">${escapeText(w.ticker)}</span>
          ${dirIcon}
          <span style="${convStyle};padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600">
            ${escapeText((w.conviction || 'hold').toUpperCase())}
          </span>
        </div>
      </div>
      <p class="text-[#b0b3c5] text-sm mb-3">${escapeText(w.thesis || '')}</p>
      <div class="flex gap-4 text-sm mb-4">
        ${w.entry_price ? `<span class="text-[#b0b3c5]">Entry: <span class="text-white">$${escapeText(w.entry_price)}</span></span>` : ''}
        ${w.target_price ? `<span class="text-[#b0b3c5]">Target: <span class="text-green-400">$${escapeText(w.target_price)}</span></span>` : ''}
        ${w.stop_price ? `<span class="text-[#b0b3c5]">Stop: <span class="text-red-400">$${escapeText(w.stop_price)}</span></span>` : ''}
      </div>
      <div class="border-t border-[#2d3248] pt-3">
        <div class="flex gap-2 mb-3">
          <button type="button" class="agree-btn px-4 py-2 rounded text-sm font-medium transition-colors"
            data-watch="${w.id}" data-val="agree" data-state="${existingAgreement === 'agree' ? 'on' : 'off'}">Agree</button>
          <button type="button" class="agree-btn px-4 py-2 rounded text-sm font-medium transition-colors"
            data-watch="${w.id}" data-val="disagree" data-state="${existingAgreement === 'disagree' ? 'on' : 'off'}">Disagree</button>
        </div>
        <details class="text-sm">
          <summary class="text-[#60a5fa] cursor-pointer select-none">Adjust targets / notes</summary>
          <div class="mt-2 space-y-2">
            <div class="flex gap-2">
              <input type="number" step="0.01" placeholder="Adj target" data-field="adj_target" data-watch="${escapeAttr(w.id)}"
                value="${escapeAttr(w.feedback?.adj_target || '')}"
                class="w-full bg-[#0f1117] border border-[#2d3248] rounded px-3 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none">
              <input type="number" step="0.01" placeholder="Adj stop" data-field="adj_stop" data-watch="${escapeAttr(w.id)}"
                value="${escapeAttr(w.feedback?.adj_stop || '')}"
                class="w-full bg-[#0f1117] border border-[#2d3248] rounded px-3 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none">
            </div>
            <textarea placeholder="Notes..." data-field="notes" data-watch="${escapeAttr(w.id)}" rows="2"
              class="w-full bg-[#0f1117] border border-[#2d3248] rounded px-3 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none resize-none">${escapeText(w.feedback?.notes || '')}</textarea>
          </div>
        </details>
      </div>
    </div>`;
}

export function renderBriefPage({ user, briefDate, brief, pod }) {
  const watches = brief?.watches || [];
  const whale = watches.find(w => w.is_whale);
  const others = watches.filter(w => !w.is_whale);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="referrer" content="no-referrer">
  <title>Whale Watcher - ${escapeText(briefDate)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    /* Agree/Disagree button states. Driven by data-state, not className regex. */
    .agree-btn { background:#2d3248; color:#b0b3c5; }
    .agree-btn[data-val="agree"]:hover { background:rgba(22,163,74,0.3); color:#4ade80; }
    .agree-btn[data-val="disagree"]:hover { background:rgba(220,38,38,0.3); color:#f87171; }
    .agree-btn[data-val="agree"][data-state="on"] { background:#16a34a; color:#fff; }
    .agree-btn[data-val="disagree"][data-state="on"] { background:#dc2626; color:#fff; }
  </style>
</head>
<body class="bg-[#0f1117] text-[#f0f0f5] min-h-screen">
  <header class="bg-[#1c1f2e] border-b border-[#2d3248] p-4">
    <div class="max-w-3xl mx-auto flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-white">Whale Watcher</h1>
        <p class="text-sm text-[#b0b3c5]">${escapeText(briefDate)} &middot; ${escapeText(user.name)}'s Pod</p>
      </div>
      <div id="save-status" class="text-sm text-[#b0b3c5]"></div>
    </div>
  </header>

  <main class="max-w-3xl mx-auto p-4 space-y-4">
    ${!brief ? `
      <div class="bg-[#1c1f2e] rounded-lg p-8 text-center border border-[#2d3248]">
        <p class="text-xl text-[#b0b3c5]">No brief for ${escapeText(briefDate)} yet.</p>
        <p class="text-sm text-[#60a5fa] mt-2">Check back after 6:00 AM PST.</p>
      </div>
    ` : `
      ${whale ? `
        <div class="mb-2">
          <h2 class="text-lg font-semibold text-blue-400 mb-2">Today's Whale</h2>
          ${watchCard(whale, 0)}
        </div>
      ` : ''}

      <h2 class="text-lg font-semibold text-[#b0b3c5]">All Watches</h2>
      <div class="space-y-3">
        ${others.map((w, i) => watchCard(w, i + 1)).join('')}
      </div>

      <div class="pt-4">
        <button onclick="submitAll()" id="submit-btn"
          class="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-colors">
          Submit Feedback
        </button>
      </div>
    `}

    <!-- Pod Management -->
    <div class="bg-[#1c1f2e] rounded-lg p-5 border border-[#2d3248] mt-6">
      <h2 class="text-lg font-semibold text-white mb-3">Your Pod</h2>
      <div class="flex flex-wrap gap-2 mb-4" id="pod-tags">
        ${pod.map(p => `
          <span class="inline-flex items-center gap-1 bg-[#2d3248] text-[#f0f0f5] px-3 py-1 rounded-full text-sm">
            <span class="font-mono">${escapeText(p.ticker)}</span>
            <button type="button" class="pod-remove text-[#b0b3c5] hover:text-red-400 ml-1" data-ticker="${escapeAttr(p.ticker)}" aria-label="Remove ${escapeAttr(p.ticker)}">&times;</button>
          </span>
        `).join('')}
      </div>
      <div class="flex gap-2">
        <input id="add-ticker" type="text" placeholder="Add ticker..." maxlength="10"
          class="flex-1 bg-[#0f1117] border border-[#2d3248] rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none uppercase">
        <button id="pod-add-btn" type="button"
          class="bg-[#2d3248] hover:bg-[#3d4258] text-white px-4 py-2 rounded text-sm font-medium transition-colors">Add</button>
      </div>
    </div>

    <div class="text-center text-xs text-[#666] pb-8 pt-4">
      Not financial advice. DYOR.
    </div>
  </main>

  <script>
    const TOKEN = new URLSearchParams(location.search).get('t');
    const agreements = {};

    // Initialize agreements map from any pre-set data-state on page load.
    document.querySelectorAll('.agree-btn[data-state="on"]').forEach(btn => {
      agreements[btn.dataset.watch] = btn.dataset.val;
    });

    function setAgreement(watchId, val) {
      // Toggle: clicking the same value clears the agreement.
      const current = agreements[watchId];
      const next = current === val ? null : val;
      if (next === null) {
        delete agreements[watchId];
      } else {
        agreements[watchId] = next;
      }
      document.querySelectorAll('.agree-btn[data-watch="' + watchId + '"]').forEach(btn => {
        btn.dataset.state = (btn.dataset.val === next) ? 'on' : 'off';
      });
    }

    // Event delegation: any click on a .agree-btn triggers setAgreement with its data-val.
    document.addEventListener('click', e => {
      const btn = e.target.closest('.agree-btn');
      if (btn) {
        setAgreement(btn.dataset.watch, btn.dataset.val);
        return;
      }
      const remove = e.target.closest('.pod-remove');
      if (remove) {
        podAction(remove.dataset.ticker, 'remove');
        return;
      }
      if (e.target.id === 'pod-add-btn') {
        const input = document.getElementById('add-ticker');
        podAction(input.value, 'add');
      }
    });

    async function submitAll() {
      const btn = document.getElementById('submit-btn');
      const status = document.getElementById('save-status');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      const items = [];
      document.querySelectorAll('[data-watch-id]').forEach(card => {
        const watchId = card.dataset.watchId;
        const agreement = agreements[watchId] || null;
        const adjTarget = card.querySelector('[data-field="adj_target"]')?.value || null;
        const adjStop = card.querySelector('[data-field="adj_stop"]')?.value || null;
        const notes = card.querySelector('[data-field="notes"]')?.value || null;
        if (agreement || adjTarget || adjStop || notes) {
          items.push({
            watch_id: watchId,
            agreement,
            adj_target: adjTarget ? parseFloat(adjTarget) : null,
            adj_stop: adjStop ? parseFloat(adjStop) : null,
            notes,
          });
        }
      });

      if (!items.length) {
        status.textContent = 'Nothing to save';
        status.className = 'text-sm text-yellow-400';
        btn.disabled = false;
        btn.textContent = 'Submit Feedback';
        return;
      }

      try {
        const res = await fetch('/api/feedback?t=' + TOKEN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });
        const data = await res.json();
        if (res.ok) {
          status.textContent = 'Saved ' + data.saved + ' items';
          status.className = 'text-sm text-green-400';
        } else {
          status.textContent = data.error || 'Error';
          status.className = 'text-sm text-red-400';
        }
      } catch (e) {
        status.textContent = 'Network error';
        status.className = 'text-sm text-red-400';
      }

      btn.disabled = false;
      btn.textContent = 'Submit Feedback';
    }

    async function podAction(ticker, action) {
      if (!ticker) return;
      const status = document.getElementById('save-status');
      try {
        const res = await fetch('/api/pod?t=' + TOKEN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker, action }),
        });
        const data = await res.json();
        if (res.ok) {
          status.textContent = action === 'add' ? ticker.toUpperCase() + ' requested' : ticker + ' removal requested';
          status.className = 'text-sm text-green-400';
          if (action === 'add') document.getElementById('add-ticker').value = '';
        }
      } catch (e) {
        status.textContent = 'Error';
        status.className = 'text-sm text-red-400';
      }
    }
  </script>
</body>
</html>`;
}
