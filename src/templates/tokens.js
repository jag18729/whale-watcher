// Design tokens. Single source of truth for color, type, and motion across the
// HTML pages and the email template. Imported by base-styles.js for the web and
// re-inlined at render time by brief-email.js for email clients (which require
// inline styles and cannot consume CSS variables).
//
// Aesthetic direction: Bathythermograph editorial. A 1970s oceanographic field
// journal crossed with a Bloomberg terminal printed on chart paper.

export const colors = {
  paper:  '#F2EDE2',  // Aged chart paper, dominant background
  ink:    '#141414',  // Near-black ink, primary text
  abyss:  '#0B1C24',  // Deep-sea teal, inverted sections / footer
  tide:   '#2B5F6B',  // Muted ocean teal, structural rules and grid
  kelp:   '#6B7A3A',  // Olive green, surface (bullish)
  rust:   '#B8451F',  // Oxidized iron red, dive (bearish)
  signal: '#E6B422',  // Brass buoy yellow, accent reserved for whale-of-the-day
};

// Font stacks. Web pages load Fraunces and IBM Plex Mono from bunny.net (a
// privacy-respecting Google Fonts mirror with no tracking or analytics).
// Fallbacks are chosen so that even if the webfont fails the page still reads
// as editorial, not generic system-ui.
export const fonts = {
  display: '"Fraunces", "Times New Roman", Georgia, serif',
  body:    '"Fraunces", "Times New Roman", Georgia, serif',
  mono:    '"IBM Plex Mono", "SFMono-Regular", "Menlo", Consolas, monospace',
};

// Motion durations. All animations defined in base-styles.js use these so the
// vocabulary stays consistent across pages.
export const motion = {
  sonarPing:   '1200ms',  // Sonar ring expands from the whale card on load
  surfaceDive: '180ms',   // Agree/disagree button micro-interaction
  tideStagger: '60ms',    // Per-item delay for staggered watch-row reveal
  gaugeSweep:  '400ms',   // Conviction badge fill animation
  tickerDrift: '120s',    // Ticker drift across the whale banner background
};

// Spacing scale (rem). Editorial layouts breathe; do not compress.
export const space = {
  xs:  '0.25rem',
  sm:  '0.5rem',
  md:  '1rem',
  lg:  '1.75rem',
  xl:  '3rem',
  xxl: '5rem',
};

// Type scale. Display sizes are deliberately large for hero plates.
export const type = {
  caption:  '0.72rem',   // Plate / figure labels in small caps
  body:     '1rem',
  bodyLg:   '1.125rem',
  h3:       '1.5rem',
  h2:       '2.25rem',
  h1:       '3.5rem',
  hero:     '4.5rem',    // Whale ticker on the brief page
};
