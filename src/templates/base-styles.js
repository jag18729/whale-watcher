// Shared CSS for every HTML page on ww.vandine.us. Imported and inlined as a
// <style> block by the brief page, the landing page, and the personal dashboard.
// Driven entirely by the constants in tokens.js (mirrored here as CSS variables
// so the runtime can read them with getComputedStyle).
//
// Loading strategy: fonts come from bunny.net (privacy-respecting Google Fonts
// mirror, no tracking, no Referer leak when paired with the meta no-referrer
// directive on every page). The CSS is hand-written, no Tailwind. Total weight
// is small enough to inline on every page (~6 KB after gzip).

import { colors, fonts, motion } from './tokens.js';

// SVG paper grain encoded as a tiny data URI. Two octaves of fractal noise at
// low alpha so it reads as paper texture, not visible noise.
const PAPER_GRAIN = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.08  0 0 0 0 0.06  0 0 0 0 0.05  0 0 0 0.06 0'/></filter><rect width='240' height='240' filter='url(%23n)'/></svg>`;

// Decorative isobath contour SVG used as section dividers. Three nested
// irregular curves in the tide color, hairline weight, evoking a topo map.
const ISOBATH = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 60' preserveAspectRatio='none'><g fill='none' stroke='%232B5F6B' stroke-width='1' stroke-opacity='0.5'><path d='M0,30 C100,18 200,42 320,30 C440,18 560,42 680,28 C740,22 780,32 800,30'/><path d='M0,38 C100,30 220,46 340,36 C460,26 580,46 700,34 C760,28 790,38 800,36'/><path d='M0,22 C120,12 240,30 360,20 C480,10 600,28 720,16 C770,12 790,18 800,18'/></g></svg>`;

export function baseStyles() {
  return `
<link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
<link rel="stylesheet" href="https://fonts.bunny.net/css?family=fraunces:400,500,600,700,900|ibm-plex-mono:400,500,600&display=swap">
<style>
  :root {
    --paper:  ${colors.paper};
    --ink:    ${colors.ink};
    --abyss:  ${colors.abyss};
    --tide:   ${colors.tide};
    --kelp:   ${colors.kelp};
    --rust:   ${colors.rust};
    --signal: ${colors.signal};

    --font-display: ${fonts.display};
    --font-body:    ${fonts.body};
    --font-mono:    ${fonts.mono};

    --rule: 1px solid color-mix(in srgb, var(--tide) 60%, transparent);
    --rule-strong: 1px solid var(--tide);

    --m-sonar:   ${motion.sonarPing};
    --m-tide:    ${motion.tideStagger};
    --m-gauge:   ${motion.gaugeSweep};
    --m-button:  ${motion.surfaceDive};
    --m-drift:   ${motion.tickerDrift};
  }

  *, *::before, *::after { box-sizing: border-box; }

  html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }

  body {
    margin: 0;
    background-color: var(--paper);
    background-image: url("${PAPER_GRAIN}");
    background-attachment: fixed;
    color: var(--ink);
    font-family: var(--font-body);
    font-size: 1.0625rem;
    line-height: 1.6;
    font-feature-settings: "kern", "liga", "onum";
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* ==========  Layout primitives  ========== */
  .ww-page {
    max-width: 64rem;
    margin: 0 auto;
    padding: 0 1.5rem;
  }
  @media (min-width: 840px) {
    .ww-page { padding: 0 3rem; }
  }

  .ww-rule {
    border: none;
    border-top: var(--rule);
    margin: 1.5rem 0;
  }
  .ww-rule--strong { border-top: var(--rule-strong); }

  .ww-isobath {
    height: 60px;
    background-image: url("${ISOBATH}");
    background-size: 100% 100%;
    background-repeat: no-repeat;
    margin: 2.5rem 0;
  }

  /* ==========  Typography  ========== */
  .ww-display {
    font-family: var(--font-display);
    font-weight: 600;
    font-variation-settings: "opsz" 144, "SOFT" 100;
    line-height: 1.05;
    letter-spacing: -0.01em;
    color: var(--ink);
    margin: 0;
  }
  h1.ww-display { font-size: clamp(2.5rem, 6vw, 3.5rem); }
  h2.ww-display { font-size: clamp(1.75rem, 4vw, 2.25rem); }
  h3.ww-display { font-size: 1.5rem; font-weight: 500; }

  .ww-body {
    font-family: var(--font-body);
    font-weight: 400;
    font-variation-settings: "opsz" 12, "SOFT" 100;
    line-height: 1.65;
  }

  .ww-mono {
    font-family: var(--font-mono);
    font-feature-settings: "kern", "tnum";
    letter-spacing: -0.01em;
  }

  /* Editorial small-caps caption: "PLATE I -- TODAY'S WHALE" */
  .ww-caption {
    font-family: var(--font-display);
    font-feature-settings: "smcp", "c2sc";
    text-transform: lowercase;
    letter-spacing: 0.18em;
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--tide);
  }
  /* Fallback for browsers without true small caps in the font: */
  @supports not (font-feature-settings: "smcp") {
    .ww-caption { text-transform: uppercase; font-size: 0.7rem; }
  }
  .ww-caption--ink { color: var(--ink); }

  /* Byline: "Dispatch for Rafa -- 08 APR 2026" */
  .ww-byline {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 400;
    color: color-mix(in srgb, var(--ink) 70%, transparent);
    font-size: 1rem;
  }

  /* ==========  Inverted sections (deep sea)  ========== */
  .ww-abyss {
    background: var(--abyss);
    color: var(--paper);
    position: relative;
    overflow: hidden;
  }
  .ww-abyss::before {
    content: "";
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse at 20% 20%, rgba(230,180,34,0.04) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 80%, rgba(230,180,34,0.03) 0%, transparent 60%);
    pointer-events: none;
  }
  .ww-abyss .ww-display { color: var(--paper); }
  .ww-abyss .ww-caption { color: color-mix(in srgb, var(--signal) 70%, transparent); }

  /* ==========  Chart-paper grid background  ========== */
  .ww-grid {
    background-color: color-mix(in srgb, var(--paper) 96%, var(--tide) 4%);
    background-image:
      linear-gradient(to right, color-mix(in srgb, var(--tide) 8%, transparent) 1px, transparent 1px),
      linear-gradient(to bottom, color-mix(in srgb, var(--tide) 8%, transparent) 1px, transparent 1px),
      linear-gradient(to right, color-mix(in srgb, var(--tide) 18%, transparent) 1px, transparent 1px),
      linear-gradient(to bottom, color-mix(in srgb, var(--tide) 18%, transparent) 1px, transparent 1px);
    background-size: 8px 8px, 8px 8px, 40px 40px, 40px 40px;
  }

  /* ==========  Conviction gauge  ========== */
  .ww-gauge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.6rem;
    border: 1px solid currentColor;
    border-radius: 2px;
    font-family: var(--font-display);
    font-feature-settings: "smcp";
    text-transform: lowercase;
    letter-spacing: 0.16em;
    font-size: 0.7rem;
    font-weight: 600;
  }
  .ww-gauge__bar {
    display: inline-block;
    height: 6px;
    width: 56px;
    border: 1px solid currentColor;
    position: relative;
    overflow: hidden;
  }
  .ww-gauge__bar::after {
    content: "";
    position: absolute;
    inset: 0;
    background: currentColor;
    transform-origin: left;
    animation: ww-gauge-sweep var(--m-gauge) cubic-bezier(0.25, 1, 0.4, 1) forwards;
  }
  .ww-gauge--high   { color: var(--signal); }
  .ww-gauge--medium { color: var(--kelp); }
  .ww-gauge--low    { color: var(--rust); }
  .ww-gauge--hold   { color: var(--tide); }
  .ww-gauge--high   .ww-gauge__bar::after { transform: scaleX(1.0); }
  .ww-gauge--medium .ww-gauge__bar::after { transform: scaleX(0.66); }
  .ww-gauge--low    .ww-gauge__bar::after { transform: scaleX(0.33); }
  .ww-gauge--hold   .ww-gauge__bar::after { transform: scaleX(0.1);  }

  /* ==========  Direction labels (surface / dive)  ========== */
  .ww-direction {
    font-family: var(--font-display);
    font-feature-settings: "smcp";
    text-transform: lowercase;
    letter-spacing: 0.18em;
    font-size: 0.78rem;
    font-weight: 600;
  }
  .ww-direction--surface { color: var(--kelp); }
  .ww-direction--dive    { color: var(--rust); }

  /* ==========  Sonar ping (whale card load animation)  ========== */
  .ww-sonar {
    position: absolute;
    border: 2px solid var(--signal);
    border-radius: 50%;
    width: 60px; height: 60px;
    pointer-events: none;
    animation: ww-sonar-ping var(--m-sonar) cubic-bezier(0, 0, 0.2, 1) forwards;
  }
  @keyframes ww-sonar-ping {
    0%   { transform: scale(0.4); opacity: 0.7; }
    100% { transform: scale(3.6); opacity: 0; }
  }

  /* ==========  Tide-in stagger reveal  ========== */
  .ww-tide-in { opacity: 0; transform: translateY(8px); animation: ww-tide-in 500ms cubic-bezier(0.2, 0.7, 0.2, 1) forwards; }
  @keyframes ww-tide-in {
    to { opacity: 1; transform: none; }
  }

  /* ==========  Editorial form controls  ========== */
  .ww-input {
    font-family: var(--font-mono);
    font-size: 0.95rem;
    background: transparent;
    border: none;
    border-bottom: var(--rule-strong);
    color: var(--ink);
    padding: 0.4rem 0.2rem;
    outline: none;
    transition: border-color var(--m-button);
  }
  .ww-input:focus { border-bottom-color: var(--signal); }
  .ww-input::placeholder { color: color-mix(in srgb, var(--ink) 35%, transparent); font-style: italic; }

  /* ==========  Buttons (agree / disagree / submit)  ========== */
  .ww-button {
    font-family: var(--font-display);
    font-feature-settings: "smcp";
    text-transform: lowercase;
    letter-spacing: 0.18em;
    font-size: 0.85rem;
    font-weight: 600;
    background: transparent;
    border: 1.5px solid var(--ink);
    color: var(--ink);
    padding: 0.7rem 1.4rem;
    cursor: pointer;
    position: relative;
    transition: transform var(--m-button) ease, background-color var(--m-button) ease, color var(--m-button) ease;
    min-height: 48px;
    -webkit-tap-highlight-color: transparent;
  }
  .ww-button:hover, .ww-button:focus-visible { outline: none; transform: translateY(-1px); }
  .ww-button[data-val="agree"][data-state="on"]    { background: var(--kelp);   color: var(--paper); border-color: var(--kelp);   transform: translateY(-2px); }
  .ww-button[data-val="disagree"][data-state="on"] { background: var(--rust);   color: var(--paper); border-color: var(--rust);   transform: translateY(2px); }
  .ww-button--primary { background: var(--ink); color: var(--paper); }
  .ww-button--primary:hover { background: var(--abyss); }

  /* ==========  Specimen tag (pod ticker chip)  ========== */
  .ww-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.8rem;
    border: 1px solid var(--tide);
    background: transparent;
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: var(--ink);
    border-radius: 0;
    letter-spacing: 0.02em;
  }
  .ww-tag__close {
    background: none; border: none; cursor: pointer;
    color: var(--tide); font-size: 1.1rem; line-height: 1; padding: 0;
  }
  .ww-tag__close:hover { color: var(--rust); }

  /* ==========  Sticky bottom submit bar (mobile)  ========== */
  .ww-submit-bar {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    padding: 0.85rem 1.25rem calc(0.85rem + env(safe-area-inset-bottom, 0px));
    background: color-mix(in srgb, var(--paper) 96%, var(--ink) 4%);
    border-top: var(--rule-strong);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    transform: translateY(110%);
    transition: transform 220ms cubic-bezier(0.2, 0.7, 0.2, 1);
    z-index: 50;
  }
  .ww-submit-bar[data-active="true"] { transform: translateY(0); }
  .ww-submit-bar__count {
    font-family: var(--font-display);
    font-feature-settings: "smcp";
    text-transform: lowercase;
    letter-spacing: 0.16em;
    font-size: 0.78rem;
    color: var(--tide);
  }

  /* ==========  Masthead, plate, footer  ========== */
  .ww-masthead {
    padding: 3rem 0 1rem;
  }
  .ww-masthead .ww-display {
    font-size: clamp(2.75rem, 9vw, 5rem);
    font-weight: 900;
    font-variation-settings: "opsz" 144, "SOFT" 30;
    letter-spacing: -0.025em;
    margin-top: 0.4rem;
  }
  .ww-masthead .ww-caption { display: block; }

  .ww-plate {
    padding: 2rem 0 1.5rem;
  }
  .ww-plate__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .ww-plate__head .ww-caption { white-space: nowrap; }
  .ww-plate__title {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: clamp(1.6rem, 4vw, 2.25rem);
    margin: 0;
    line-height: 1.1;
  }

  .ww-pod-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 0.6rem;
    margin: 1rem 0 1.5rem;
  }
  .ww-pod-add {
    display: flex;
    gap: 1rem;
    align-items: flex-end;
  }
  .ww-pod-add .ww-input { flex: 1; min-width: 0; max-width: 14rem; }

  .ww-footer {
    padding: 3rem 0 6rem;
    text-align: center;
    border-top: var(--rule);
    margin-top: 2rem;
  }
  .ww-footer .ww-caption { display: block; margin-bottom: 0.6rem; color: color-mix(in srgb, var(--tide) 80%, transparent); }
  .ww-disclaimer {
    font-family: var(--font-body);
    font-style: italic;
    font-size: 0.85rem;
    color: color-mix(in srgb, var(--ink) 50%, transparent);
    margin: 0;
  }

  /* ==========  Status / save flash  ========== */
  .ww-flash {
    font-family: var(--font-display);
    font-feature-settings: "smcp";
    text-transform: lowercase;
    letter-spacing: 0.16em;
    font-size: 0.78rem;
    color: var(--tide);
    transition: color var(--m-button);
  }
  .ww-flash[data-tone="ok"]   { color: var(--kelp); }
  .ww-flash[data-tone="warn"] { color: var(--rust); }

  /* ==========  Reduced motion  ========== */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
    .ww-sonar { display: none; }
  }
</style>
`;
}
