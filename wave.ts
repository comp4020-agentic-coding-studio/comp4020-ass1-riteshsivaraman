// The wave trace, as an SVG path string. Still no DOM: this returns a string,
// which makes the thing the reader actually looks at testable without a
// browser.
//
// The visual argument of the whole page is "count the crests" — the emitted
// trace and the received trace are drawn the same width, so a wave that has
// been stretched simply fits fewer times across it.

/** How many crests represent the unshifted 500nm light. Everything else is
 *  scaled against this, so the ratio on screen is the ratio in the physics. */
export const BASE_CRESTS = 9;

/**
 * A sine wave as an SVG path.
 *
 * @param width    width of the drawing area, in viewBox units
 * @param height   full peak-to-trough height
 * @param crests   how many full cycles fit across `width`
 * @param samples  points per cycle; more is smoother and longer
 */
export function sineWavePath(
  width: number,
  height: number,
  crests: number,
  samples = 24,
): string {
  const amplitude = height / 2;
  const midline = amplitude;
  const cycles = Math.max(crests, 0.05);
  const points = Math.max(2, Math.ceil(cycles * samples));

  const parts: string[] = [];
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const x = t * width;
    const y = midline - amplitude * Math.sin(t * cycles * 2 * Math.PI);
    parts.push(`${i === 0 ? "M" : "L"}${round(x)} ${round(y)}`);
  }
  return parts.join(" ");
}

/**
 * Crest count for light that arrived stretched by `1 + z`. Longer wavelength,
 * fewer crests across the same distance — the inverse relationship is the
 * point of the picture.
 */
export function crestsForRedshift(z: number): number {
  return BASE_CRESTS / (1 + z);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
