// Wavelength → what the eye would make of it. Also no DOM.
//
// The interesting case here is not the middle of the visible band; it is the
// end of it. This page's slider pushes 500nm out past 2000nm, so the honest
// answer for most of the slider's travel is "you cannot see this any more".
// These functions have to say that clearly rather than quietly clamping and
// pretending the light is still red.

/** Ends of the visible band, in nanometres. Also the ends of the spectrum bar. */
export const VISIBLE_MIN_NM = 380;
export const VISIBLE_MAX_NM = 780;

export type Rgb = { r: number; g: number; b: number };

/** Is this wavelength something a human eye could still register? */
export function isVisible(nm: number): boolean {
  return nm >= VISIBLE_MIN_NM && nm <= VISIBLE_MAX_NM;
}

/**
 * Approximate visible-spectrum colour for a wavelength: the usual piecewise
 * hue ramp (violet → blue → cyan → green → yellow → red) with an intensity
 * falloff at both ends of the band.
 *
 * Outside the band the intensity is zero — black, not a clamped red. The
 * light really has left the visible spectrum, and the page says so in words
 * next to the bar; the colour shouldn't contradict it.
 */
export function wavelengthToColor(nm: number): Rgb {
  let r = 0;
  let g = 0;
  let b = 0;

  if (nm >= 380 && nm < 440) {
    r = -(nm - 440) / (440 - 380);
    b = 1;
  } else if (nm >= 440 && nm < 490) {
    g = (nm - 440) / (490 - 440);
    b = 1;
  } else if (nm >= 490 && nm < 510) {
    g = 1;
    b = -(nm - 510) / (510 - 490);
  } else if (nm >= 510 && nm < 580) {
    r = (nm - 510) / (580 - 510);
    g = 1;
  } else if (nm >= 580 && nm < 645) {
    r = 1;
    g = -(nm - 645) / (645 - 580);
  } else if (nm >= 645 && nm <= 780) {
    r = 1;
  }

  // Dim towards both edges: the eye's response tails off before the band does.
  let intensity = 1;
  if (nm >= 380 && nm < 420) {
    intensity = 0.3 + (0.7 * (nm - 380)) / 40;
  } else if (nm > 700 && nm <= 780) {
    intensity = 0.3 + (0.7 * (780 - nm)) / 80;
  } else if (!isVisible(nm)) {
    intensity = 0;
  }

  const channel = (v: number) => Math.round(255 * Math.max(0, v) * intensity);
  return { r: channel(r), g: channel(g), b: channel(b) };
}

/** The same colour, ready to drop into CSS. */
export function wavelengthToCss(nm: number): string {
  const { r, g, b } = wavelengthToColor(nm);
  return `rgb(${r} ${g} ${b})`;
}

/**
 * Where this wavelength sits along the spectrum bar, as 0–1.
 *
 * Clamped, deliberately: once the light has redshifted past the visible band
 * the marker parks at the right-hand edge and the page labels it "beyond
 * visible", rather than sliding off into empty space where the reader can no
 * longer see what the slider is doing.
 */
export function spectrumPosition(nm: number): number {
  const t = (nm - VISIBLE_MIN_NM) / (VISIBLE_MAX_NM - VISIBLE_MIN_NM);
  return Math.min(Math.max(t, 0), 1);
}
