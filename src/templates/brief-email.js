// Whale Watcher morning brief email renderer.
// Conviction-focused layout: tickers grouped by conviction tier (HIGH, MEDIUM, HOLD)
// with a pod conviction meter at the top showing the overall posture.
//
// Bathythermograph editorial palette via shared tokens.js.
// All inline styles (email clients require it).
// Georgia serif + Menlo mono (email clients strip custom font imports).

import { colors } from './tokens.js';

const C = {
  paper:  colors.paper,
  ink:    colors.ink,
  abyss:  colors.abyss,
  tide:   colors.tide,
  kelp:   colors.kelp,
  rust:   colors.rust,
  signal: colors.signal,
  white:  '#ffffff',
  bg:     colors.paper,
  border: '#d5d0c5',
  borderLight: '#e8e3d9',
  muted:  '#7a7567',
};

const FONT = {
  display: "Georgia, 'Times New Roman', serif",
  body:    "Georgia, 'Times New Roman', serif",
  mono:    "'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace",
};

const CONVICTION = {
  high:   { bg: '#e8ecd3', color: C.kelp, label: 'HIGH' },
  medium: { bg: '#f0ebdd', color: C.tide, label: 'MEDIUM' },
  low:    { bg: '#f0ddd5', color: C.rust, label: 'LOW' },
  hold:   { bg: '#e5e2db', color: C.muted, label: 'HOLD' },
};

function badge(conviction) {
  const v = CONVICTION[conviction] || CONVICTION.hold;
  return `<span style="background:${v.bg};color:${v.color};padding:2px 10px;font-size:10px;font-weight:700;letter-spacing:1.5px;font-family:${FONT.display};text-transform:uppercase">${v.label}</span>`;
}

function directionLabel(direction) {
  const color = direction === 'surface' ? C.kelp : C.rust;
  return `<span style="color:${color};font-size:11px;font-weight:700;letter-spacing:2px;font-family:${FONT.display};text-transform:uppercase">${direction === 'surface' ? 'SURFACE' : 'DIVE'}</span>`;
}

function pctColor(val) { return val >= 0 ? C.kelp : C.rust; }
function pctSign(val) { return val >= 0 ? '+' : ''; }
function absPct(val) { return Math.abs(val || 0).toFixed(2); }

function convictionReason(changePct) {
  if (changePct == null) return '';
  const abs = Math.abs(changePct);
  if (abs > 5) return `${absPct(changePct)}% move -- strong signal`;
  if (abs > 2) return `${absPct(changePct)}% exceeds 2% threshold`;
  if (abs > 0.5) return `${absPct(changePct)}% moderate movement`;
  return `${absPct(changePct)}% within noise range`;
}

function sectionHead(label) {
  return `<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:${C.tide};margin:0 0 14px;padding-bottom:8px;border-bottom:1px solid ${C.border};font-family:${FONT.display}">${label}</div>`;
}

function card(content) {
  return `<div style="background:${C.white};border:1px solid ${C.border};padding:18px;margin-bottom:10px">${content}</div>`;
}

// ===== Whale spotlight (unchanged -- the hero section) =====

function renderWhaleSpotlight(whale) {
  if (!whale) return '';
  const pct = whale.change_pct != null ? `<span style="color:${pctColor(whale.change_pct)};font-weight:700">${pctSign(whale.change_pct)}${whale.change_pct}%</span>` : '';
  const bullets = (whale.bullets || []).map(b => `<li style="color:${C.white};font-size:14px;line-height:1.7;font-family:${FONT.body};opacity:0.85;margin-bottom:2px">${b}</li>`).join('');
  const reason = convictionReason(whale.change_pct);
  const prices = [
    whale.entry ? `<span style="color:${C.muted}">Entry</span> <strong>$${whale.entry}</strong>` : '',
    whale.target ? `<span style="color:${C.muted}">Target</span> <strong style="color:${C.kelp}">$${whale.target}</strong>` : '',
    whale.stop ? `<span style="color:${C.muted}">Stop</span> <strong style="color:${C.rust}">$${whale.stop}</strong>` : '',
  ].filter(Boolean).join('&nbsp;&nbsp;&nbsp;');

  return `
    <div style="background:${C.abyss};padding:28px 24px;margin-bottom:28px">
      <div style="font-size:10px;font-weight:700;letter-spacing:2.5px;color:${C.signal};font-family:${FONT.display};text-transform:uppercase;margin-bottom:14px">PLATE I &middot; TODAY'S WHALE</div>
      <div style="margin-bottom:12px">
        <span style="font-family:${FONT.mono};font-size:28px;font-weight:800;color:${C.white}">${whale.ticker}</span>
        <span style="margin-left:10px">${directionLabel(whale.direction)}</span>
        <span style="margin-left:10px">${badge(whale.conviction)}</span>
        ${whale.price ? `<span style="float:right;font-size:22px;font-weight:700;color:${C.white};font-family:${FONT.mono}">$${whale.price} ${pct}</span>` : ''}
      </div>
      ${reason ? `<p style="font-size:12px;color:${C.signal};margin:0 0 10px;font-family:${FONT.mono};letter-spacing:0.5px">${reason}</p>` : ''}
      ${whale.recommendation ? `<p style="font-size:15px;color:${C.white};line-height:1.6;margin:0 0 12px;font-weight:500;font-family:${FONT.body};opacity:0.9">${whale.recommendation}</p>` : ''}
      ${bullets ? `<ul style="margin:0 0 12px;padding-left:18px">${bullets}</ul>` : ''}
      ${prices ? `<div style="font-size:12px;color:${C.white};padding-top:12px;border-top:1px solid rgba(255,255,255,0.15);font-family:${FONT.mono}">${prices}</div>` : ''}
    </div>`;
}

// ===== Conviction meter: visual bar showing HIGH / MEDIUM / HOLD ratio =====

function renderConvictionMeter(companies) {
  if (!companies?.length) return '';
  const counts = { high: 0, medium: 0, low: 0, hold: 0 };
  const surfaceCounts = { high: 0, medium: 0, low: 0, hold: 0 };
  for (const c of companies) {
    const tier = (c.conviction || 'hold').toLowerCase();
    const k = counts[tier] !== undefined ? tier : 'hold';
    counts[k]++;
    if ((c.direction || 'surface') === 'surface') surfaceCounts[k]++;
  }
  const total = companies.length;

  // Build a segmented bar using table cells (most compatible across email clients)
  const segments = ['high', 'medium', 'low', 'hold']
    .filter(k => counts[k] > 0)
    .map(k => {
      const pct = Math.round((counts[k] / total) * 100);
      const bg = k === 'high' ? C.signal : k === 'medium' ? C.tide : k === 'low' ? C.rust : C.muted;
      return `<td style="width:${pct}%;background:${bg};height:8px;padding:0"></td>`;
    }).join('');

  const labels = ['high', 'medium', 'low', 'hold']
    .filter(k => counts[k] > 0)
    .map(k => {
      const v = CONVICTION[k];
      const dive = counts[k] - surfaceCounts[k];
      const detail = `${surfaceCounts[k]} surface${dive > 0 ? `, ${dive} dive` : ''}`;
      return `<span style="color:${v.color};font-family:${FONT.display};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase">${v.label}: ${counts[k]}</span> <span style="color:${C.muted};font-size:11px;font-family:${FONT.body}">(${detail})</span>`;
    }).join('&nbsp;&nbsp;&nbsp;&nbsp;');

  return `
    <div style="margin-bottom:28px">
      ${sectionHead('POD CONVICTION METER')}
      <table style="width:100%;border-collapse:collapse;margin-bottom:10px"><tr>${segments}</tr></table>
      <div style="line-height:2">${labels}</div>
    </div>`;
}

// ===== HIGH conviction: full cards with direction, price, reason =====

function renderHighConviction(tickers) {
  if (!tickers.length) return '';
  const surface = tickers.filter(c => c.direction === 'surface');
  const dive = tickers.filter(c => c.direction !== 'surface');

  const renderCard = (c) => {
    const pct = c.change_pct != null ? `<span style="color:${pctColor(c.change_pct)};font-size:13px;font-weight:700;font-family:${FONT.mono}">${pctSign(c.change_pct)}${c.change_pct}%</span>` : '';
    const reason = convictionReason(c.change_pct);
    const bullets = (c.bullets || []).map(b => `<li style="color:${C.muted};font-size:13px;line-height:1.6;font-family:${FONT.body}">${b}</li>`).join('');
    const prices = [
      c.entry ? `Entry $${c.entry}` : '',
      c.target ? `<span style="color:${C.kelp}">Target $${c.target}</span>` : '',
      c.stop ? `<span style="color:${C.rust}">Stop $${c.stop}</span>` : '',
    ].filter(Boolean).join(' &middot; ');

    return card(
      `<div style="margin-bottom:8px">
        <span style="font-family:${FONT.mono};font-size:16px;font-weight:700;color:${C.ink}">${c.ticker}</span>
        <span style="margin-left:8px">${directionLabel(c.direction)}</span>
        <span style="margin-left:8px">${badge(c.conviction)}</span>
        ${c.price ? `<span style="float:right;font-size:16px;font-weight:700;color:${C.ink};font-family:${FONT.mono}">$${c.price} ${pct}</span>` : ''}
      </div>` +
      (reason ? `<div style="font-size:11px;color:${C.tide};font-family:${FONT.mono};margin-bottom:8px;letter-spacing:0.5px">${reason}</div>` : '') +
      (bullets ? `<ul style="margin:0 0 6px;padding-left:16px">${bullets}</ul>` : '') +
      (c.recommendation ? `<p style="font-size:13px;color:${C.ink};margin:6px 0;padding:8px 10px;background:${C.paper};border-left:3px solid ${C.signal};font-family:${FONT.body}">${c.recommendation}</p>` : '') +
      (prices ? `<div style="font-size:11px;color:${C.muted};margin-top:6px;font-family:${FONT.mono}">${prices}</div>` : '')
    );
  };

  let html = `<div style="margin-bottom:28px">${sectionHead('PLATE II &middot; HIGH CONVICTION')}`;
  if (surface.length) {
    html += `<div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:${C.kelp};font-family:${FONT.display};text-transform:uppercase;margin:12px 0 8px">SURFACE (${surface.length})</div>`;
    html += surface.map(renderCard).join('');
  }
  if (dive.length) {
    html += `<div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:${C.rust};font-family:${FONT.display};text-transform:uppercase;margin:12px 0 8px">DIVE (${dive.length})</div>`;
    html += dive.map(renderCard).join('');
  }
  html += '</div>';
  return html;
}

// ===== MEDIUM conviction: compact table =====

function renderMediumConviction(tickers) {
  if (!tickers.length) return '';
  const rows = tickers.map((c, i) => {
    const bg = i % 2 === 0 ? C.white : C.paper;
    const pct = c.change_pct != null ? `<span style="color:${pctColor(c.change_pct)};font-weight:600">${pctSign(c.change_pct)}${c.change_pct}%</span>` : '';
    const dir = c.direction === 'surface'
      ? `<span style="color:${C.kelp};font-size:10px;letter-spacing:1px;font-family:${FONT.display}">SURFACE</span>`
      : `<span style="color:${C.rust};font-size:10px;letter-spacing:1px;font-family:${FONT.display}">DIVE</span>`;
    return `<tr>
      <td style="padding:8px 12px;font-family:${FONT.mono};font-weight:700;font-size:13px;color:${C.ink};background:${bg}">${c.ticker}</td>
      <td style="padding:8px 12px;font-size:13px;text-align:center;background:${bg}">${dir}</td>
      <td style="padding:8px 12px;font-size:13px;font-family:${FONT.mono};color:${C.ink};text-align:right;background:${bg}">${c.price ? '$' + c.price : ''}</td>
      <td style="padding:8px 12px;font-size:13px;font-family:${FONT.mono};text-align:right;background:${bg}">${pct}</td>
    </tr>`;
  }).join('');

  return `<div style="margin-bottom:28px">
    ${sectionHead('PLATE III &middot; MEDIUM CONVICTION')}
    <table style="width:100%;border-collapse:collapse;border:1px solid ${C.border}">
      <thead><tr style="background:${C.paper}">
        <th style="padding:6px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${C.tide};text-align:left;font-family:${FONT.display}">Ticker</th>
        <th style="padding:6px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${C.tide};text-align:center;font-family:${FONT.display}">Direction</th>
        <th style="padding:6px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${C.tide};text-align:right;font-family:${FONT.display}">Price</th>
        <th style="padding:6px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${C.tide};text-align:right;font-family:${FONT.display}">Change</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// ===== HOLD: single compact line =====

function renderHoldConviction(tickers) {
  if (!tickers.length) return '';
  const list = tickers.map(c => {
    const pct = c.change_pct != null ? `${pctSign(c.change_pct)}${c.change_pct}%` : '';
    return `<span style="font-family:${FONT.mono};font-size:12px;color:${C.muted}">${c.ticker} ${pct}</span>`;
  }).join('&nbsp;&nbsp;&middot;&nbsp;&nbsp;');

  return `<div style="margin-bottom:28px">
    ${sectionHead('HOLD')}
    <div style="padding:10px 0;line-height:2">${list}</div>
  </div>`;
}

// ===== Political, macro, events, top plays (kept from previous version) =====

function renderPolitical(data) {
  if (!data) return '';
  const bullets = (data.bullets || []).map(b => `<li style="color:${C.ink};font-size:14px;line-height:1.7;font-family:${FONT.body}">${b}</li>`).join('');
  return `<div style="margin-bottom:28px">
    ${sectionHead('POLITICAL LANDSCAPE')}
    ${card(`<p style="font-size:15px;color:${C.ink};line-height:1.6;margin:0 0 10px;font-weight:600;font-family:${FONT.display}">${data.headline || ''}</p>` +
      (bullets ? `<ul style="margin:0;padding-left:18px">${bullets}</ul>` : ''))}
  </div>`;
}

function renderMacro(data) {
  if (!data || !Object.keys(data).length) return '';
  const rows = Object.entries(data).map(([key, val], i) => {
    const v = typeof val === 'object' ? (val.value || val.price || '') : val;
    const change = typeof val === 'object' ? val.change : null;
    const chHtml = change != null ? `<span style="color:${pctColor(change)};font-weight:600">${pctSign(change)}${change}</span>` : '';
    const bg = i % 2 === 0 ? C.white : C.paper;
    return `<tr><td style="padding:8px 14px;font-size:13px;color:${C.ink};background:${bg};font-family:${FONT.body}">${key}</td><td style="padding:8px 14px;font-size:13px;font-weight:600;color:${C.ink};text-align:right;background:${bg};font-family:${FONT.mono}">${v}</td><td style="padding:8px 14px;font-size:13px;text-align:right;background:${bg};font-family:${FONT.mono}">${chHtml}</td></tr>`;
  }).join('');

  return `<div style="margin-bottom:28px">
    ${sectionHead('MARKET DASHBOARD')}
    <table style="width:100%;border-collapse:collapse;border:1px solid ${C.border}">
      <thead><tr style="background:${C.paper}"><th style="padding:8px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${C.tide};text-align:left;font-family:${FONT.display}">Indicator</th><th style="padding:8px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${C.tide};text-align:right;font-family:${FONT.display}">Value</th><th style="padding:8px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${C.tide};text-align:right;font-family:${FONT.display}">Change</th></tr></thead>
      <tbody>${rows}</tbody></table>
  </div>`;
}

function renderTopPlays(plays) {
  if (!plays?.length) return '';
  return `<div style="margin-bottom:28px">
    ${sectionHead('TOP PLAYS')}
    ${plays.map(p => {
      const reason = convictionReason(p.change_pct || null);
      return card(
        `<div style="margin-bottom:6px">
          <span style="font-family:${FONT.mono};font-size:15px;font-weight:700;color:${C.ink}">${p.ticker}</span>
          <span style="margin-left:6px">${directionLabel(p.direction)}</span>
          <span style="margin-left:6px">${badge(p.conviction)}</span>
        </div>
        ${reason ? `<div style="font-size:11px;color:${C.tide};font-family:${FONT.mono};margin-bottom:4px">${reason}</div>` : ''}
        <p style="font-size:13px;color:${C.muted};line-height:1.6;margin:0;font-family:${FONT.body}">${p.reasoning || ''}</p>`
      );
    }).join('')}
  </div>`;
}

function renderEvents(events) {
  if (!events?.length) return '';
  return `<div style="margin-bottom:28px">
    ${sectionHead('UPCOMING EVENTS')}
    ${card(events.map(e =>
      `<div style="padding:5px 0;border-bottom:1px solid ${C.borderLight};font-size:13px;color:${C.ink};font-family:${FONT.body}">${e}</div>`
    ).join(''))}
  </div>`;
}

// ===== Main render =====

export function renderBriefEmail({ date, subject, summary_line, sections, user, reviewUrl }) {
  const companies = sections?.companies || [];
  const whale = companies.find(c => c.is_whale);
  const nonWhale = companies.filter(c => !c.is_whale);
  const funds = sections?.funds || [];
  const topPlays = sections?.top_plays || [];
  const events = sections?.events || [];

  // Group non-whale tickers by conviction tier.
  const high = nonWhale.filter(c => (c.conviction || 'hold') === 'high');
  const medium = nonWhale.filter(c => (c.conviction || 'hold') === 'medium');
  const low = nonWhale.filter(c => (c.conviction || 'hold') === 'low');
  const hold = nonWhale.filter(c => (c.conviction || 'hold') === 'hold');

  // Sort high conviction by absolute change descending (strongest signal first).
  high.sort((a, b) => Math.abs(b.change_pct || 0) - Math.abs(a.change_pct || 0));

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:${FONT.body};-webkit-font-smoothing:antialiased">
<div style="max-width:600px;margin:0 auto;padding:36px 16px">

  <!-- Header -->
  <div style="text-align:center;margin-bottom:32px">
    <h1 style="font-size:28px;font-weight:700;color:${C.ink};margin:0;letter-spacing:-0.5px;font-family:${FONT.display}">WHALE WATCHER<span style="font-family:${FONT.mono};font-size:14px;color:${C.tide};vertical-align:middle;margin-left:6px;letter-spacing:1px">)))</span></h1>
    <p style="font-size:13px;color:${C.tide};margin:8px 0 0;font-family:${FONT.display};letter-spacing:1.5px;text-transform:uppercase;font-weight:700">${date}</p>
    ${summary_line ? `<p style="font-size:15px;color:${C.ink};margin:10px 0 0;font-weight:500;font-family:${FONT.body};font-style:italic">${summary_line}</p>` : ''}
  </div>

  <div style="height:1px;background:${C.border};margin-bottom:28px"></div>

  <!-- Conviction meter -->
  ${renderConvictionMeter(companies)}

  <!-- Today's Whale -->
  ${renderWhaleSpotlight(whale)}

  <!-- Conviction tiers -->
  ${renderHighConviction(high)}
  ${renderMediumConviction(medium)}
  ${low.length ? renderHighConviction(low) : ''}
  ${renderHoldConviction(hold)}

  <!-- Context sections -->
  ${renderPolitical(sections?.political)}
  ${renderMacro(sections?.macro)}
  ${renderTopPlays(topPlays)}
  ${renderEvents(events)}

  <!-- Funds (if any) -->
  ${funds.length ? `<div style="margin-bottom:28px">
    ${sectionHead('FUND TRACKER')}
    ${funds.map((f, i) => {
      const bg = i % 2 === 0 ? C.white : C.paper;
      const ch = f.change_pct != null ? `<span style="color:${pctColor(f.change_pct)};font-weight:600">${pctSign(f.change_pct)}${f.change_pct}%</span>` : '';
      return `<div style="display:flex;justify-content:space-between;padding:6px 12px;background:${bg};font-family:${FONT.mono};font-size:12px"><span style="font-weight:700;color:${C.ink}">${f.ticker}</span><span>${f.price ? '$' + f.price : ''} ${ch}</span></div>`;
    }).join('')}
  </div>` : ''}

  <!-- CTA -->
  ${reviewUrl ? `
    <div style="text-align:center;margin:32px 0">
      <a href="${reviewUrl}" style="display:inline-block;background:${C.abyss};color:${C.white};padding:14px 32px;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;font-family:${FONT.display}">Review &amp; Tune Your Pod</a>
    </div>` : ''}

  <!-- Footer -->
  <div style="text-align:center;padding-top:20px;border-top:1px solid ${C.border}">
    <p style="font-size:10px;color:${C.muted};margin:0;letter-spacing:1px;text-transform:uppercase;font-family:${FONT.display}">Surface = bullish &middot; Dive = bearish &middot; Whale = day's largest mover</p>
    <p style="font-size:11px;color:${C.muted};margin:8px 0 0;font-family:${FONT.body};font-style:italic">Not financial advice. Do your own research.</p>
    <p style="font-size:10px;color:${C.muted};margin:6px 0 0;font-family:${FONT.display};letter-spacing:1px">WHALE WATCHER &middot; VANDINE</p>
  </div>

</div></body></html>`;
}
