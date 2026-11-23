// JMFoodies brand mark.
//
// Vector stand-in for the client logo (image 2): white chef hat with a brown
// outline, brown moustache, golden-yellow disc, spatula and wooden paddle, and
// the red "JMFoodies · snack bar" ribbon.
//
// Two forms:
//   logoMark(size)  -> circular badge only (hat, moustache, disc, utensils).
//                      Used in the sidebar brand row next to the HTML wordmark.
//   logoFull(size)  -> badge plus the red ribbon wordmark. Used on the home
//                      hero and the auth screens.
//
// Both return an SVG string. Colours are the project brand tokens as literals
// on purpose: the logo must not change colour with the surrounding UI theme.
//
// If the client supplies the real artwork, drop it in `public/` and swap the
// <svg> for an <img> here; nothing else in the app needs to change.

const GOLD = '#f5c518';
const RED = '#c0392b';
const BROWN = '#3e2723';
const BROWN_MID = '#5d4037';
const WHITE = '#ffffff';

// The badge occupies the top square of the 128x128 viewBox so that logoFull can
// append the ribbon underneath without moving the artwork.
function badge() {
  return `
    <g>
      <circle cx="64" cy="56" r="33" fill="${GOLD}"/>
      <g stroke="${BROWN}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M26 22 l7 -7 11 11 -7 7 z" fill="${BROWN_MID}"/>
        <path d="M33 33 L24 42" fill="none"/>
        <path d="M102 15 c7 2 10 8 8 15 -2 7 -8 11 -14 9 -6 -2 -8 -9 -6 -16 2 -6 6 -9 12 -8 z" fill="${BROWN_MID}"/>
        <path d="M95 39 L88 50" fill="none"/>
      </g>
      <g fill="${WHITE}" stroke="${BROWN}" stroke-width="3" stroke-linejoin="round">
        <circle cx="45" cy="42" r="14"/>
        <circle cx="64" cy="32" r="17"/>
        <circle cx="83" cy="42" r="14"/>
        <rect x="47" y="46" width="34" height="19" rx="5"/>
      </g>
      <path d="M64 79 c-4 -6 -12 -8 -18 -5 -4 2 -8 0 -7 -4 1 -5 9 -7 15 -4 4 2 7 5 10 9 z" fill="${BROWN}"/>
      <path d="M64 79 c4 -6 12 -8 18 -5 4 2 8 0 7 -4 -1 -5 -9 -7 -15 -4 -4 2 -7 5 -10 9 z" fill="${BROWN}"/>
    </g>`;
}

function svg(size, body, label, decorative) {
  const a11y = decorative
    ? 'aria-hidden="true" focusable="false"'
    : `role="img" aria-label="${label}"`;

  return `<svg viewBox="0 0 128 128" width="${size}" height="${size}" ${a11y} xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

/**
 * Circular badge only — hat, moustache, disc, utensils.
 * @param {number} size rendered pixel size (square)
 * @param {{ decorative?: boolean }} [opts] decorative defaults to true
 */
export function logoMark(size = 40, opts = {}) {
  const decorative = opts.decorative !== false;
  return svg(size, badge(), 'JMFoodies', decorative);
}

/**
 * Full lockup: badge plus the red ribbon wordmark.
 * @param {number} size rendered pixel size (square)
 * @param {{ decorative?: boolean }} [opts] decorative defaults to false
 */
export function logoFull(size = 96, opts = {}) {
  const decorative = opts.decorative === true;
  const ribbon = `
    <g>
      <path d="M8 88 q56 10 112 0 v20 q-56 10 -112 0 z" fill="${RED}"/>
      <path d="M12 94 q52 8 104 0" fill="none" stroke="${WHITE}" stroke-width="1.4" opacity=".75"/>
      <text x="56" y="104" text-anchor="middle" font-family="DM Sans, Segoe UI, sans-serif"
            font-size="15" font-weight="700" letter-spacing="1.2" fill="${GOLD}">JMFoodies</text>
      <text x="112" y="110" text-anchor="end" font-family="DM Sans, Segoe UI, sans-serif"
            font-size="7.5" font-style="italic" fill="${WHITE}">snack bar</text>
    </g>`;

  return svg(size, badge() + ribbon, 'JMFoodies snack bar', decorative);
}
