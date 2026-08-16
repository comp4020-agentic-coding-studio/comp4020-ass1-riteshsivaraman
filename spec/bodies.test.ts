import { describe, expect, it } from "vitest";
import {
  BODIES,
  MAX_RADII,
  MIN_RADII,
  compactnessOf,
  compactnessToRedshift,
  redshiftBetweenRadii,
} from "../redshift";

// The two simulations that sit either side of the core slider: one that shows
// redshift is a relationship between two positions, one that shows the same
// formula against objects that actually exist.

describe("redshiftBetweenRadii", () => {
  it("is zero when both observers sit at the same depth", () => {
    for (const r of [1.05, 2, 5, 12]) {
      expect(redshiftBetweenRadii(r, r)).toBeCloseTo(0, 12);
    }
  });

  it("redshifts light climbing outward", () => {
    expect(redshiftBetweenRadii(2, 10)).toBeGreaterThan(0);
  });

  it("blueshifts light falling inward", () => {
    // Not an edge case to suppress — half of what this section teaches.
    expect(redshiftBetweenRadii(10, 2)).toBeLessThan(0);
  });

  it("is stronger the deeper the emitter sits", () => {
    let previous = -Infinity;
    for (const rEmit of [8, 6, 4, 3, 2, 1.5, 1.1]) {
      const z = redshiftBetweenRadii(rEmit, MAX_RADII);
      expect(z).toBeGreaterThan(previous);
      previous = z;
    }
  });

  it("agrees with the infinite-observer formula the slider uses", () => {
    // Two routes to the same physics. If these ever disagree, one of them is
    // wrong, and this test says so without anyone having to notice by eye.
    for (const r of [1.5, 2, 4, 10]) {
      const viaRadii = redshiftBetweenRadii(r, 1e9);
      const viaCompactness = compactnessToRedshift(1 / r);
      expect(viaRadii).toBeCloseTo(viaCompactness, 6);
    }
  });

  it("stays finite at the closest approach the diagram allows", () => {
    const z = redshiftBetweenRadii(MIN_RADII, MAX_RADII);
    expect(Number.isFinite(z)).toBe(true);
    expect(z).toBeGreaterThan(0);
  });
});

describe("compactnessOf", () => {
  it("puts Earth's gravity somewhere around a part in a billion", () => {
    const earth = BODIES.find((b) => b.id === "earth")!;
    const z = compactnessToRedshift(compactnessOf(earth.massKg, earth.radiusM));
    expect(z).toBeGreaterThan(1e-10);
    expect(z).toBeLessThan(1e-8);
  });

  it("reproduces the measured redshift of Sirius B", () => {
    // The 1925 measurement, ~2.7e-4, is the reason this object is on the
    // page at all. If the maths drifts, this catches it against reality
    // rather than against my own arithmetic.
    const sirius = BODIES.find((b) => b.id === "sirius-b")!;
    const z = compactnessToRedshift(compactnessOf(sirius.massKg, sirius.radiusM));
    expect(z).toBeGreaterThan(2.0e-4);
    expect(z).toBeLessThan(3.5e-4);
  });

  it("gives a neutron star a redshift you could actually see", () => {
    const ns = BODIES.find((b) => b.id === "neutron-star")!;
    const z = compactnessToRedshift(compactnessOf(ns.massKg, ns.radiusM));
    expect(z).toBeGreaterThan(0.1);
    expect(z).toBeLessThan(0.5);
  });

  it("orders the offered bodies weakest to strongest", () => {
    const zs = BODIES.map((b) => compactnessToRedshift(compactnessOf(b.massKg, b.radiusM)));
    for (let i = 1; i < zs.length; i++) {
      expect(zs[i]).toBeGreaterThan(zs[i - 1]);
    }
  });

  it("keeps every offered body outside its own horizon", () => {
    for (const b of BODIES) {
      expect(compactnessOf(b.massKg, b.radiusM)).toBeLessThan(1);
    }
  });
});
