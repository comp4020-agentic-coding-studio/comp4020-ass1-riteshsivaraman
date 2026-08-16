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

/**
 * Escape velocity at the surface, as a fraction of the speed of light.
 *
 *   v_esc / c = √(2GM/Rc²) = √x
 *
 * This is the honest way to put a number on the slider. It follows from the
 * compactness alone — no radius to invent, no second variable smuggled in —
 * and it says something a reader can hold: at 0.95 the light is climbing out
 * of a well whose escape velocity is 97% of light speed.
 */
export function escapeFraction(x: number): number {
  return Math.sqrt(Math.min(Math.max(x, 0), MAX_COMPACTNESS));
}

// --- Two positions in the same well ----------------------------------------
//
// The slider above quietly assumes the receiver is infinitely far away. That
// hides the more general truth: redshift is a relationship *between two
// positions*, not a property the star has. Light climbing outward reddens;
// light falling inward blueshifts. Same formula, sign follows the direction.

/**
 * Redshift for light emitted at `rEmit` and received at `rObs`, both measured
 * in Schwarzschild radii (so `r = 1` is the horizon, `r = 10` is ten times
 * further out):
 *
 *   1 + z = √( (1 − 1/r_obs) / (1 − 1/r_emit) )
 *
 * Returns negative `z` — a blueshift — when the receiver sits deeper in the
 * well than the emitter, which is not an edge case to suppress but half of
 * what the section is teaching.
 */
export function redshiftBetweenRadii(rEmit: number, rObs: number): number {
  const factor = (r: number) => 1 - 1 / Math.max(r, MIN_RADII);
  return Math.sqrt(factor(rObs) / factor(rEmit)) - 1;
}

/** How close to the horizon the two-observer diagram lets you drag. Below
 *  this the curve is too steep to control with a finger on a phone. */
export const MIN_RADII = 1.05;
export const MAX_RADII = 12;

// --- Real objects ----------------------------------------------------------

const G = 6.6743e-11;
const C = 299792458;

/** Compactness `x = 2GM/(Rc²)` for something that actually exists. */
export function compactnessOf(massKg: number, radiusM: number): number {
  return (2 * G * massKg) / (radiusM * C * C);
}

export type Body = {
  id: string;
  name: string;
  blurb: string;
  massKg: number;
  radiusM: number;
};

const SOLAR_MASS = 1.989e30;

/** Ordered weakest to strongest, which is also the order they are offered. */
export const BODIES: Body[] = [
  {
    id: "earth",
    name: "Earth",
    blurb: "Clocks at sea level run slower than clocks on a mountain. GPS has to correct for it.",
    massKg: 5.972e24,
    radiusM: 6.371e6,
  },
  {
    id: "sun",
    name: "The Sun",
    blurb: "Measured in solar spectral lines, and small enough that it took decades to pin down.",
    massKg: SOLAR_MASS,
    radiusM: 6.957e8,
  },
  {
    id: "sirius-b",
    name: "Sirius B",
    blurb:
      "A white dwarf: the Sun's mass inside something the size of Earth. Its redshift was measured in 1925 and became early evidence for general relativity.",
    massKg: 1.018 * SOLAR_MASS,
    radiusM: 5.8e6,
  },
  {
    id: "neutron-star",
    name: "A neutron star",
    blurb:
      "About one and a half Suns packed into a city. Light leaves its surface visibly reddened.",
    massKg: 1.4 * SOLAR_MASS,
    radiusM: 1.2e4,
  },
];
