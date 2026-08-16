// The physics of the page, with no DOM in sight.
//
// Everything the explainer shows is driven by one number: the compactness
//
//   x = 2GM / (Rc²)
//
// which is dimensionless and, with the radius held conceptually fixed, means
// exactly one thing to the reader: how much gravity. That honesty is the
// point — one slider, one physical quantity, no decorative colour-cycling
// wearing physics as a costume.

/** Wavelength the star emits, in nanometres. Cyan-green: unmistakably visible
 *  before the shift, so the shift has somewhere to go. */
export const EMITTED_NM = 500;

/** The slider's ceiling. Compactness reaches 1 at the event horizon, where the
 *  redshift diverges, so the usable range has to stop short of it. */
export const MAX_COMPACTNESS = 0.95;

/**
 * Gravitational redshift factor at compactness `x`:
 *
 *   1 + z = 1 / √(1 − x)
 *
 * `x = 0` (no gravity) gives `z = 0`. As `x → 1` the factor diverges — that
 * divergence is real, not an error, so the input is clamped just below 1
 * rather than being allowed to return Infinity into the DOM.
 */
export function compactnessToRedshift(x: number): number {
  const clamped = Math.min(Math.max(x, 0), MAX_COMPACTNESS);
  return 1 / Math.sqrt(1 - clamped) - 1;
}

/**
 * The wavelength a distant observer measures, given what was emitted and the
 * redshift it climbed out of: `λ_obs = λ_emit × (1 + z)`.
 */
export function observedWavelength(emittedNm: number, z: number): number {
  return emittedNm * (1 + z);
}

/** The whole chain, for callers that only hold a slider value. */
export function observedFromCompactness(
  x: number,
  emittedNm: number = EMITTED_NM,
): { z: number; observedNm: number } {
  const z = compactnessToRedshift(x);
  return { z, observedNm: observedWavelength(emittedNm, z) };
}
