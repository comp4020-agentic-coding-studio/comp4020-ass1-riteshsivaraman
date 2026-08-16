import { describe, expect, it } from "vitest";
import {
  EMITTED_NM,
  MAX_COMPACTNESS,
  compactnessToRedshift,
  observedFromCompactness,
  observedWavelength,
} from "../redshift";

// The physics of the core interaction, tested with no DOM in the way. A wrong
// formula surfaces here, in milliseconds, rather than as a plausible-looking
// colour on a page nobody can check by eye.

describe("compactnessToRedshift", () => {
  it("is zero when there is no gravity", () => {
    expect(compactnessToRedshift(0)).toBe(0);
  });

  it("matches the closed form at a known point", () => {
    // x = 0.75 → 1/√0.25 = 2 → z = 1: the light arrives at twice the
    // wavelength it left with.
    expect(compactnessToRedshift(0.75)).toBeCloseTo(1, 10);
  });

  it("increases strictly with compactness", () => {
    let previous = -Infinity;
    for (let x = 0; x <= MAX_COMPACTNESS; x += 0.05) {
      const z = compactnessToRedshift(x);
      expect(z).toBeGreaterThan(previous);
      previous = z;
    }
  });

  it("stays finite at the top of the slider's range", () => {
    // z diverges at the horizon. The slider stops short of it, and the clamp
    // means no amount of over-driving the input can put Infinity or NaN into
    // the DOM.
    for (const x of [MAX_COMPACTNESS, 1, 1.5, 99]) {
      const z = compactnessToRedshift(x);
      expect(Number.isFinite(z)).toBe(true);
      expect(z).toBeCloseTo(compactnessToRedshift(MAX_COMPACTNESS), 10);
    }
  });

  it("clamps negative compactness to no shift rather than blueshifting", () => {
    expect(compactnessToRedshift(-1)).toBe(0);
  });
});

describe("observedWavelength", () => {
  it("leaves light untouched when there is no redshift", () => {
    expect(observedWavelength(EMITTED_NM, 0)).toBe(EMITTED_NM);
  });

  it("stretches the wavelength by a factor of 1 + z", () => {
    expect(observedWavelength(500, 1)).toBe(1000);
    expect(observedWavelength(500, 0.5)).toBe(750);
  });
});

describe("observedFromCompactness", () => {
  it("carries 500nm light out of the visible band well before the slider's end", () => {
    // The page's central claim, as a number: turn gravity up far enough and
    // the light you could see is gone. 780nm is the red edge of the band.
    const { observedNm } = observedFromCompactness(MAX_COMPACTNESS);
    expect(observedNm).toBeGreaterThan(780);
  });

  it("moves the observed wavelength monotonically as the slider moves", () => {
    let previous = -Infinity;
    for (let x = 0; x <= MAX_COMPACTNESS; x += 0.05) {
      const { observedNm } = observedFromCompactness(x);
      expect(observedNm).toBeGreaterThan(previous);
      previous = observedNm;
    }
  });

  it("starts at the emitted wavelength", () => {
    expect(observedFromCompactness(0).observedNm).toBe(EMITTED_NM);
  });
});
