// Whale Watcher Dashboard - Cloudflare Worker
// Live market data dashboard with Finnhub API

export default {
  async fetch(request, env) {
    const FINNHUB_KEY = env.FINNHUB_API_KEY || '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🐋 Whale Watcher</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
    .fade-in { animation: fadeIn 0.3s ease-out; }
  </style>
</head>
<body class="bg-gray-900 text-white min-h-screen">
  <!-- Header -->
  <header class="bg-gray-800 border-b border-gray-700 p-4 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto flex justify-between items-center">
      <div class="flex items-center space-x-4">
        <h1 class="text-3xl font-bold">🐋 Whale Watcher</h1>
        <div class="flex items-center space-x-2">
          <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse" id="status-dot"></div>
          <span class="text-sm text-green-400" id="status-text">Connecting...</span>
        </div>
      </div>
      <div class="text-right">
        <div class="text-sm text-gray-400" id="last-update">--</div>
        <div class="text-xs text-gray-500">Auto-refresh 30s</div>
      </div>
    </div>
  </header>

  <div class="max-w-7xl mx-auto p-6 space-y-8">
    <!-- Market Overview -->
    <section>
      <h2 class="text-2xl font-bold mb-6 text-center">📊 Market Overview</h2>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4" id="market-overview"></div>
    </section>

    <!-- Watchlists -->
    <section class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="bg-gray-800 rounded-lg p-5">
        <h3 class="text-lg font-bold mb-4 text-blue-400">💻 Tech</h3>
        <div class="space-y-2" id="tech-list"></div>
      </div>
      <div class="bg-gray-800 rounded-lg p-5">
        <h3 class="text-lg font-bold mb-4 text-green-400">🛢️ Energy</h3>
        <div class="space-y-2" id="energy-list"></div>
      </div>
      <div class="bg-gray-800 rounded-lg p-5">
        <h3 class="text-lg font-bold mb-4 text-purple-400">🛡️ Defense</h3>
        <div class="space-y-2" id="defense-list"></div>
      </div>
    </section>

    <!-- Conviction Board -->
    <section class="bg-gray-800 rounded-lg p-6">
      <h3 class="text-xl font-bold mb-4 text-yellow-400 text-center">🎯 Conviction Board</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="conviction-board">
        <div class="bg-gray-700 rounded-lg p-4 border-l-4 border-green-500">
          <div class="flex justify-between items-center mb-1">
            <span class="font-mono text-lg font-bold">CVX</span><span>🟢</span>
          </div>
          <div class="text-sm text-gray-300">Energy rotation continues — strong fundamentals + dividend yield</div>
        </div>
        <div class="bg-gray-700 rounded-lg p-4 border-l-4 border-yellow-500">
          <div class="flex justify-between items-center mb-1">
            <span class="font-mono text-lg font-bold">PLTR</span><span>🟡</span>
          </div>
          <div class="text-sm text-gray-300">AI/Gov contract pipeline strong — wait for pullback entry</div>
        </div>
        <div class="bg-gray-700 rounded-lg p-4 border-l-4 border-green-500">
          <div class="flex justify-between items-center mb-1">
            <span class="font-mono text-lg font-bold">XOM</span><span>🟢</span>
          </div>
          <div class="text-sm text-gray-300">Oil prices holding — XOM well-positioned for Q1 earnings</div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <div class="text-center text-xs text-gray-500 pb-4">
      <p>⚠️ Not financial advice. DYOR.</p>
      <p class="mt-1">Data: Finnhub • Protected by Cloudflare Access</p>
    </div>
  </div>

  <script>
    const API_KEY = '${FINNHUB_KEY}';

    const WATCHLISTS = {
      market: ['SPY','QQQ','DIA','IWM'],
      tech: ['AAPL','MSFT','GOOGL','META','NVDA','TSLA','PLTR'],
      energy: ['XOM','CVX','OXY','XLE','USO'],
      defense: ['LMT','RTX','NOC','GD','LHX']
    };

    function stockCard(sym, data) {
      const c = data.c || 0, d = data.d || 0, dp = data.dp || 0;
      const up = d >= 0;
      const color = up ? 'text-green-400' : 'text-red-400';
      const border = up ? 'border-green-500/30' : 'border-red-500/30';
      const sign = up ? '+' : '';
      return '<div class="bg-gray-800 rounded-lg p-4 border ' + border + ' fade-in">' +
        '<div class="text-xs text-gray-400 mb-1">' + sym + '</div>' +
        '<div class="text-xl font-bold">$' + c.toFixed(2) + '</div>' +
        '<div class="text-sm ' + color + '">' + sign + d.toFixed(2) + ' (' + sign + dp.toFixed(2) + '%)</div>' +
      '</div>';
    }

    function stockRow(sym, data) {
      const c = data.c || 0, d = data.d || 0, dp = data.dp || 0;
      const up = d >= 0;
      const color = up ? 'text-green-400' : 'text-red-400';
      const sign = up ? '+' : '';
      return '<div class="flex justify-between items-center py-2 border-b border-gray-700/50 fade-in">' +
        '<span class="font-mono font-bold text-sm">' + sym + '</span>' +
        '<div class="text-right">' +
          '<div class="text-sm font-bold">$' + c.toFixed(2) + '</div>' +
          '<div class="text-xs ' + color + '">' + sign + dp.toFixed(2) + '%</div>' +
        '</div>' +
      '</div>';
    }

    async function fetchQuote(sym) {
      try {
        const r = await fetch('https://finnhub.io/api/v1/quote?symbol=' + sym + '&token=' + API_KEY);
        if (!r.ok) return null;
        return await r.json();
      } catch { return null; }
    }

    async function loadAll() {
      const dot = document.getElementById('status-dot');
      const txt = document.getElementById('status-text');
      dot.className = 'w-2 h-2 bg-yellow-500 rounded-full animate-pulse';
      txt.textContent = 'Updating...';
      txt.className = 'text-sm text-yellow-400';

      try {
        const allSyms = [...new Set([...WATCHLISTS.market, ...WATCHLISTS.tech, ...WATCHLISTS.energy, ...WATCHLISTS.defense])];
        const results = {};
        // Batch in groups of 5 to respect rate limits
        for (let i = 0; i < allSyms.length; i += 5) {
          const batch = allSyms.slice(i, i + 5);
          const promises = batch.map(async s => { results[s] = await fetchQuote(s); });
          await Promise.all(promises);
          if (i + 5 < allSyms.length) await new Promise(r => setTimeout(r, 200));
        }

        // Render market overview
        document.getElementById('market-overview').innerHTML =
          WATCHLISTS.market.map(s => results[s] ? stockCard(s, results[s]) : '').join('');

        // Render watchlists
        document.getElementById('tech-list').innerHTML =
          WATCHLISTS.tech.map(s => results[s] ? stockRow(s, results[s]) : '').join('');
        document.getElementById('energy-list').innerHTML =
          WATCHLISTS.energy.map(s => results[s] ? stockRow(s, results[s]) : '').join('');
        document.getElementById('defense-list').innerHTML =
          WATCHLISTS.defense.map(s => results[s] ? stockRow(s, results[s]) : '').join('');

        dot.className = 'w-2 h-2 bg-green-500 rounded-full animate-pulse';
        txt.textContent = 'Live';
        txt.className = 'text-sm text-green-400';
        document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
      } catch (e) {
        dot.className = 'w-2 h-2 bg-red-500 rounded-full';
        txt.textContent = 'Error';
        txt.className = 'text-sm text-red-400';
      }
    }

    loadAll();
    setInterval(loadAll, 30000);
  </script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      },
    });
  },
};
