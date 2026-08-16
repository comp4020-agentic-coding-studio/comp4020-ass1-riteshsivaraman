// Axis ticks at round numbers. No DOM.
//
// The gridlines this replaces were spaced by CSS flex, which meant they sat at
// 0% / 25% / 50% / 75% / 100% at every magnification — identical at 10× and at
// a million×, with only the labels changing underneath them. A grid laid out by
// the layout engine rather than by the data is decoration wearing a scale's
// clothes. Ticks chosen here land on round values, so zooming makes them
// visibly reflow and slide, which is the thing the section is trying to show.

/**
 * Round values covering `[min, max]`, spaced by a "nice" interval — 1, 2 or 5
 * times a power of ten — with roughly `target` of them.
 */
export function niceTicks(min: number, max: number, target = 5): number[] {
  const span = max - min;
  if (!Number.isFinite(span) || span <= 0 || target < 2) return [min];

  const step = niceStep(span / (target - 1));
  const decimals = decimalsFor(step);
  const first = Math.ceil(min / step) * step;

  const out: number[] = [];
  // The epsilon keeps a tick that lands exactly on `max` from being dropped by
  // floating-point drift.
  for (let v = first; v <= max + step * 1e-9; v += step) {
    out.push(Number(v.toFixed(decimals)));
  }
  return out;
}

/**
 * The *nearest* 1/2/5 × 10ⁿ to `rough` — not the next one up.
 *
 * Rounding up loses gridlines: a 0–100 window asking for five ticks wants a
 * step of 25, which is not a nice number, and rounding up to 50 leaves three
 * lines where five were wanted. Rounding to nearest gives 20, and six lines.
 */
export function niceStep(rough: number): number {
  if (!Number.isFinite(rough) || rough <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalised = rough / magnitude;
  const factor = normalised < 1.5 ? 1 : normalised < 3 ? 2 : normalised < 7 ? 5 : 10;
  return factor * magnitude;
}

/** How many decimal places a value on this step needs, so labels don't print
 *  "499.9000" beside "500.0001000". */
export function decimalsFor(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 0;
  return Math.max(0, Math.min(Math.ceil(-Math.log10(step)), 12));
}

/**
 * A tick label, written as an offset from the reference wavelength. Absolute
 * wavelengths at high magnification are nearly all shared prefix —
 * "499.999800" next to "500.000200" — and the reader has to diff two long
 * numbers to see the point. The offset *is* the point.
 */
export function offsetLabel(value: number, reference: number, step: number): string {
  const delta = value - reference;
  const decimals = decimalsFor(step);
  if (Math.abs(delta) < step / 2) return "0";
  return `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(decimals)}`;
}
