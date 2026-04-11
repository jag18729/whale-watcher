// Whale Watcher morning brief -- clean light theme email renderer
// Design: minimal, generous whitespace, premium financial newsletter feel

const C = {
  bg: '#f7f8fa',
  white: '#ffffff',
  text: '#1a1a2e',
  muted: '#6b7280',
  light: '#9ca3af',
  border: '#e5e7eb',
  borderLight: '#f0f1f3',
  accent: '#2563eb',
  accentLight: '#eff6ff',
  green: '#059669',
  greenBg: '#ecfdf5',
  red: '#dc2626',
  redBg: '#fef2f2',
  yellow: '#d97706',
  yellowBg: '#fffbeb',
  slate: '#475569',
};

const CONVICTION = {
  high:   { bg: C.greenBg, color: C.green, label: 'HIGH' },
  medium: { bg: C.yellowBg, color: C.yellow, label: 'MEDIUM' },
  low:    { bg: C.redBg, color: C.red, label: 'LOW' },
  hold:   { bg: '#f1f5f9', color: C.slate, label: 'HOLD' },
};

function badge(conviction) {
  const v = CONVICTION[conviction] || CONVICTION.hold;
  return `<span style="background:${v.bg};color:${v.color};padding:2px 8px;border-radius:3px;font-size:11px;font-weight:700;letter-spacing:0.5px">${v.label}</span>`;
}

function arrow(direction) {
  return direction === 'surface'
    ? `<span style="color:${C.green};font-size:13px">&#9650;</span>`
    : `<span style="color:${C.red};font-size:13px">&#9660;</span>`;
}

function pctColor(val) { return val >= 0 ? C.green : C.red; }
function pctSign(val) { return val >= 0 ? '+' : ''; }

function section(title, content) {
  return `
    <div style="margin-bottom:32px">
      <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${C.muted};margin:0 0 16px;padding-bottom:8px;border-bottom:2px solid ${C.border}">${title}</h2>
      ${content}
    </div>`;
}

function card(content) {
  return `<div style="background:${C.white};border:1px solid ${C.border};border-radius:8px;padding:20px;margin-bottom:12px">${content}</div>`;
}

function renderWhaleSpotlight(whale) {
  if (!whale) return '';
  const pct = whale.change_pct != null ? `<span style="color:${pctColor(whale.change_pct)};font-weight:600">${pctSign(whale.change_pct)}${whale.change_pct}%</span>` : '';
  const bullets = (whale.bullets || []).map(b => `<li style="color:${C.text};font-size:14px;line-height:1.7;margin-bottom:2px">${b}</li>`).join('');
  const prices = [
    whale.entry ? `<span style="color:${C.muted}">Entry</span> <strong>$${whale.entry}</strong>` : '',
    whale.target ? `<span style="color:${C.muted}">Target</span> <strong style="color:${C.green}">$${whale.target}</strong>` : '',
    whale.stop ? `<span style="color:${C.muted}">Stop</span> <strong style="color:${C.red}">$${whale.stop}</strong>` : '',
  ].filter(Boolean).join('&nbsp;&nbsp;&nbsp;');

  return `
    <div style="background:${C.accentLight};border:1px solid #bfdbfe;border-radius:10px;padding:24px;margin-bottom:32px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${C.accent};margin-bottom:12px">Today's Whale</div>
      <div style="margin-bottom:12px">
        <span style="font-family:'SF Mono',SFMono-Regular,Menlo,monospace;font-size:24px;font-weight:800;color:${C.text}">${whale.ticker}</span>
        <span style="margin-left:8px">${arrow(whale.direction)}</span>
        <span style="margin-left:8px">${badge(whale.conviction)}</span>
        ${whale.price ? `<span style="float:right;font-size:20px;font-weight:700;color:${C.text}">$${whale.price} ${pct}</span>` : ''}
      </div>
      ${whale.recommendation ? `<p style="font-size:15px;color:${C.text};line-height:1.6;margin:0 0 12px;font-weight:500">${whale.recommendation}</p>` : ''}
      ${bullets ? `<ul style="margin:0 0 12px;padding-left:18px">${bullets}</ul>` : ''}
      ${prices ? `<div style="font-size:13px;padding-top:10px;border-top:1px solid #bfdbfe">${prices}</div>` : ''}
    </div>`;
}

function renderPolitical(data) {
  if (!data) return '';
  const bullets = (data.bullets || []).map(b => `<li style="color:${C.text};font-size:14px;line-height:1.7">${b}</li>`).join('');
  return section('Fed &amp; Political Landscape',
    card(`<p style="font-size:15px;color:${C.text};line-height:1.6;margin:0 0 10px;font-weight:500">${data.headline || ''}</p>` +
      (bullets ? `<ul style="margin:0;padding-left:18px">${bullets}</ul>` : ''))
  );
}

function renderMacro(data) {
  if (!data) return '';
  const rows = Object.entries(data).map(([key, val], i) => {
    const v = typeof val === 'object' ? (val.value || val.price || '') : val;
    const change = typeof val === 'object' ? val.change : null;
    const chHtml = change != null ? `<span style="color:${pctColor(change)};font-weight:600">${pctSign(change)}${change}</span>` : '';
    const bg = i % 2 === 0 ? C.white : C.bg;
    return `<tr><td style="padding:10px 16px;font-size:14px;color:${C.text};background:${bg}">${key}</td><td style="padding:10px 16px;font-size:14px;font-weight:600;color:${C.text};text-align:right;background:${bg}">${v}</td><td style="padding:10px 16px;font-size:14px;text-align:right;background:${bg}">${chHtml}</td></tr>`;
  }).join('');

  return section('Market Dashboard',
    `<table style="width:100%;border-collapse:collapse;border:1px solid ${C.border};border-radius:8px;overflow:hidden">
      <thead><tr style="background:${C.bg}"><th style="padding:10px 16px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:${C.muted};text-align:left">Indicator</th><th style="padding:10px 16px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:${C.muted};text-align:right">Value</th><th style="padding:10px 16px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:${C.muted};text-align:right">Change</th></tr></thead>
      <tbody>${rows}</tbody></table>`
  );
}

function renderCompany(c) {
  const pct = c.change_pct != null ? `<span style="color:${pctColor(c.change_pct)};font-size:13px;font-weight:600">${pctSign(c.change_pct)}${c.change_pct}%</span>` : '';
  const bullets = (c.bullets || []).map(b => `<li style="color:${C.slate};font-size:13px;line-height:1.6">${b}</li>`).join('');
  const prices = [
    c.entry ? `Entry $${c.entry}` : '',
    c.target ? `<span style="color:${C.green}">Target $${c.target}</span>` : '',
    c.stop ? `<span style="color:${C.red}">Stop $${c.stop}</span>` : '',
  ].filter(Boolean).join(' &middot; ');

  return card(
    `<div style="margin-bottom:10px">
      <span style="font-family:'SF Mono',SFMono-Regular,Menlo,monospace;font-size:16px;font-weight:700;color:${C.text}">${c.ticker}</span>
      <span style="margin-left:6px">${arrow(c.direction)}</span>
      <span style="margin-left:6px">${badge(c.conviction)}</span>
      ${c.price ? `<span style="float:right;font-size:16px;font-weight:700;color:${C.text}">$${c.price} ${pct}</span>` : ''}
    </div>` +
    (bullets ? `<ul style="margin:0 0 8px;padding-left:16px">${bullets}</ul>` : '') +
    (c.recommendation ? `<p style="font-size:14px;color:${C.text};margin:8px 0;padding:10px 12px;background:${C.bg};border-radius:6px;border-left:3px solid ${C.accent}">${c.recommendation}</p>` : '') +
    (prices ? `<div style="font-size:12px;color:${C.muted};margin-top:8px">${prices}</div>` : '')
  );
}

function renderCompanies(companies) {
  if (!companies?.length) return '';
  const others = companies.filter(c => !c.is_whale);
  return section('Company Research', others.map(renderCompany).join(''));
}

function renderFunds(funds) {
  if (!funds?.length) return '';
  const rows = funds.map((f, i) => {
    const bg = i % 2 === 0 ? C.white : C.bg;
    const ch = f.change_pct != null ? `<span style="color:${pctColor(f.change_pct)};font-weight:600">${pctSign(f.change_pct)}${f.change_pct}%</span>` : '';
    return `<tr><td style="padding:8px 16px;font-family:monospace;font-weight:700;font-size:13px;color:${C.text};background:${bg}">${f.ticker}</td><td style="padding:8px 16px;font-size:13px;color:${C.text};text-align:right;background:${bg}">${f.price ? '$' + f.price : ''}</td><td style="padding:8px 16px;font-size:13px;text-align:right;background:${bg}">${ch}</td></tr>`;
  }).join('');

  return section('Fund Tracker',
    `<table style="width:100%;border-collapse:collapse;border:1px solid ${C.border};border-radius:8px;overflow:hidden">
      <thead><tr style="background:${C.bg}"><th style="padding:8px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:${C.muted};text-align:left">Fund</th><th style="padding:8px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:${C.muted};text-align:right">Price</th><th style="padding:8px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:${C.muted};text-align:right">Change</th></tr></thead>
      <tbody>${rows}</tbody></table>`
  );
}

function renderTopPlays(plays) {
  if (!plays?.length) return '';
  return section('Top Plays',
    plays.map(p => card(
      `<div style="margin-bottom:8px">
        <span style="font-family:monospace;font-size:16px;font-weight:700;color:${C.text}">${p.ticker}</span>
        <span style="margin-left:6px">${arrow(p.direction)}</span>
        <span style="margin-left:6px">${badge(p.conviction)}</span>
      </div>
      <p style="font-size:14px;color:${C.slate};line-height:1.7;margin:0">${p.reasoning || ''}</p>`
    )).join('')
  );
}

function renderEvents(events) {
  if (!events?.length) return '';
  return section('Upcoming Events',
    card(events.map(e =>
      `<div style="padding:6px 0;border-bottom:1px solid ${C.borderLight};font-size:13px;color:${C.text}">${e}</div>`
    ).join(''))
  );
}

export function renderBriefEmail({ date, subject, summary_line, sections, user, reviewUrl }) {
  const companies = sections?.companies || [];
  const whale = companies.find(c => c.is_whale);
  const funds = sections?.funds || [];
  const topPlays = sections?.top_plays || [];
  const events = sections?.events || [];

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased">
<div style="max-width:600px;margin:0 auto;padding:32px 16px">

  <!-- Header -->
  <div style="text-align:center;margin-bottom:36px">
    <div style="font-size:32px;margin-bottom:8px">&#x1F40B;</div>
    <h1 style="font-size:22px;font-weight:700;color:${C.text};margin:0;letter-spacing:-0.3px">Whale Watcher</h1>
    <p style="font-size:14px;color:${C.muted};margin:6px 0 0">${date}</p>
    ${summary_line ? `<p style="font-size:15px;color:${C.slate};margin:8px 0 0;font-weight:500">${summary_line}</p>` : ''}
  </div>

  <!-- Today's Whale -->
  ${renderWhaleSpotlight(whale)}

  <!-- Content Sections -->
  ${renderPolitical(sections?.political)}
  ${renderMacro(sections?.macro)}
  ${renderCompanies(companies)}
  ${renderFunds(funds)}
  ${renderTopPlays(topPlays)}
  ${renderEvents(events)}

  <!-- CTA -->
  ${reviewUrl ? `
    <div style="text-align:center;margin:36px 0">
      <a href="${reviewUrl}" style="display:inline-block;background:${C.accent};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Review &amp; Tune Your Pod</a>
    </div>` : ''}

  <!-- Footer -->
  <div style="text-align:center;padding-top:24px;border-top:1px solid ${C.border}">
    <p style="font-size:12px;color:${C.light};margin:0">Not financial advice. Do your own research.</p>
    <p style="font-size:11px;color:${C.light};margin:6px 0 0">Whale Watcher &middot; Vandine</p>
  </div>

</div></body></html>`;
}
