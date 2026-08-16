import { describe, expect, it } from "vitest";
import { MAX_COMPACTNESS, observedFromCompactness } from "../redshift";
import {
  VISIBLE_MAX_NM,
  VISIBLE_MIN_NM,
  isVisible,
  spectrumPosition,
  wavelengthToColor,
  wavelengthToCss,
} from "../spectrum";

describe("wavelengthToColor", () => {
  it("puts the emitted 500nm light in the cyan-green it should be", () => {
    const { r, g, b } = wavelengthToColor(500);
    expect(g).toBeGreaterThan(200);
    expect(r).toBeLessThan(g);
    expect(b).toBeLessThan(g);
  });

  it("reads as red at the far end of the band", () => {
    const { r, g, b } = wavelengthToColor(680);
    expect(r).toBeGreaterThan(200);
    expect(g).toBeLessThan(60);
    expect(b).toBeLessThan(60);
  });

  it("reads as violet-blue at the near end", () => {
    const { b } = wavelengthToColor(400);
    expect(b).toBeGreaterThan(60);
  });

  it("shifts red-ward as the light redshifts", () => {
    // Not a claim about any one colour — a claim about the direction of
    // travel, which is what the page is actually teaching.
    const cool = wavelengthToColor(observedFromCompactness(0).observedNm);
    const warm = wavelengthToColor(observedFromCompactness(0.5).observedNm);
    expect(warm.r).toBeGreaterThan(cool.r);
    expect(warm.g).toBeLessThan(cool.g);
  });

  it("goes dark outside the visible band instead of clamping to red", () => {
    // The edge case that drives the whole top half of the slider. If this
    // clamped, the page would keep showing a confident red for light no eye
    // could register, and would be lying.
    for (const nm of [900, 1500, observedFromCompactness(MAX_COMPACTNESS).observedNm]) {
      expect(isVisible(nm)).toBe(false);
      expect(wavelengthToColor(nm)).toEqual({ r: 0, g: 0, b: 0 });
    }
  });

  it("dims towards the edges rather than cutting off abruptly", () => {
    const midBand = wavelengthToColor(680);
    const nearEdge = wavelengthToColor(770);
    expect(nearEdge.r).toBeGreaterThan(0);
    expect(nearEdge.r).toBeLessThan(midBand.r);
  });

  it("never emits a channel outside 0–255", () => {
    for (let nm = 300; nm <= 2500; nm += 7) {
      for (const v of Object.values(wavelengthToColor(nm))) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(255);
        expect(Number.isInteger(v)).toBe(true);
      }
    }
  });
});

describe("wavelengthToCss", () => {
  it("is a CSS colour a browser will accept", () => {
    expect(wavelengthToCss(500)).toMatch(/^rgb\(\d+ \d+ \d+\)$/);
  });
});

describe("spectrumPosition", () => {
  it("spans 0 to 1 across the visible band", () => {
    expect(spectrumPosition(VISIBLE_MIN_NM)).toBe(0);
    expect(spectrumPosition(VISIBLE_MAX_NM)).toBe(1);
    expect(spectrumPosition(580)).toBeCloseTo(0.5, 10);
  });

  it("parks at the right-hand edge once the light leaves the band", () => {
    // Clamped on purpose: the marker stays where the reader can see it, and
    // the page labels the state in words. Sliding off the bar would hide the
    // very moment the interaction is trying to show.
    expect(spectrumPosition(1200)).toBe(1);
    expect(spectrumPosition(observedFromCompactness(MAX_COMPACTNESS).observedNm)).toBe(1);
  });

  it("never leaves 0–1", () => {
    for (let nm = 100; nm <= 3000; nm += 11) {
      const pos = spectrumPosition(nm);
      expect(pos).toBeGreaterThanOrEqual(0);
      expect(pos).toBeLessThanOrEqual(1);
    }
  });
});
