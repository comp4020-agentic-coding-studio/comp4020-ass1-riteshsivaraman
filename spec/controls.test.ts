import { describe, expect, it } from "vitest";
import { decimalsFor, niceStep, niceTicks, offsetLabel } from "../ticks";
import { advance, type Sweep } from "../sweep";
import { MAX_COMPACTNESS, escapeFraction } from "../redshift";

describe("niceTicks", () => {
  it("lands on round numbers, not on the window edges", () => {
    expect(niceTicks(0, 100, 5)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(niceTicks(3, 17, 5)).toEqual([5, 10, 15]);
  });

  it("stays inside the window", () => {
    for (const [min, max] of [[499.9, 500.1], [0, 1], [-3, 7]]) {
      for (const t of niceTicks(min, max)) {
        expect(t).toBeGreaterThanOrEqual(min);
        expect(t).toBeLessThanOrEqual(max);
      }
    }
  });

  it("produces different ticks at different scales", () => {
    // The whole point: at a new magnification the grid must actually change.
    // The old flex-spaced gridlines sat at 0/25/50/75/100% at every zoom.
    const wide = niceTicks(300, 700).join(",");
    const tight = niceTicks(499.999, 500.001).join(",");
    expect(tight).not.toBe(wide);
  });

  it("survives a window many orders of magnitude small", () => {
    const ticks = niceTicks(500 - 1e-7, 500 + 1e-7);
    expect(ticks.length).toBeGreaterThan(1);
    for (const t of ticks) expect(Number.isFinite(t)).toBe(true);
  });

  it("degrades to a single value rather than looping forever", () => {
    expect(niceTicks(5, 5)).toEqual([5]);
    expect(niceTicks(9, 1)).toEqual([9]);
  });
});

describe("niceStep and decimalsFor", () => {
  it("snaps to 1, 2 or 5 times a power of ten", () => {
    expect(niceStep(0.9)).toBeCloseTo(1, 12);
    expect(niceStep(1.7)).toBeCloseTo(2, 12);
    expect(niceStep(3)).toBeCloseTo(5, 12);
    expect(niceStep(0.025)).toBeCloseTo(0.02, 12);
    // 25 is not a nice number; nearest beats next-up, or gridlines are lost.
    expect(niceStep(25)).toBeCloseTo(20, 12);
  });

  it("asks for exactly as many decimals as the step needs", () => {
    expect(decimalsFor(1)).toBe(0);
    expect(decimalsFor(0.1)).toBe(1);
    expect(decimalsFor(0.0005)).toBe(4);
  });
});

describe("offsetLabel", () => {
  it("writes ticks as offsets, because absolute values are all shared prefix", () => {
    // "499.999800" beside "500.000200" makes a reader diff two long numbers.
    expect(offsetLabel(500.0002, 500, 0.0001)).toBe("+0.0002");
    expect(offsetLabel(499.9998, 500, 0.0001)).toBe("−0.0002");
  });

  it("calls the reference zero", () => {
    expect(offsetLabel(500, 500, 0.1)).toBe("0");
  });
});

describe("advance", () => {
  const at = (value: number, direction: 1 | -1): Sweep => ({ value, direction });

  it("resumes from where the control already is", () => {
    // Switching the animation on used to snap the slider back to its minimum,
    // because the phase was the state rather than the position.
    expect(advance(at(0.6, 1), 100, 0, 1, 4000).value).toBeGreaterThan(0.6);
  });

  it("keeps travelling the way it was going", () => {
    expect(advance(at(0.5, -1), 100, 0, 1, 4000).value).toBeLessThan(0.5);
    expect(advance(at(0.5, -1), 100, 0, 1, 4000).direction).toBe(-1);
  });

  it("turns around at each end rather than sticking or overshooting", () => {
    // 0.2 of travel from 0.98: up to the ceiling, turn, back down to 0.82.
    const bounced = advance(at(0.98, 1), 400, 0, 1, 4000);
    expect(bounced.direction).toBe(-1);
    expect(bounced.value).toBeLessThanOrEqual(1);
    expect(bounced.value).toBeCloseTo(0.82, 6);
  });

  it("stays in range even when a frame gap is longer than a full traverse", () => {
    // A backgrounded tab can hand back an enormous dt. One reflection would
    // leave the value outside the range.
    for (const dt of [5000, 60000, 1e6]) {
      const out = advance(at(0.3, 1), dt, 0, 1, 4000);
      expect(out.value).toBeGreaterThanOrEqual(0);
      expect(out.value).toBeLessThanOrEqual(1);
      expect(Number.isFinite(out.value)).toBe(true);
    }
  });

  it("does nothing sensible-breaking on a degenerate range", () => {
    expect(advance(at(5, 1), 100, 5, 5, 4000).value).toBe(5);
    expect(advance(at(0.5, 1), 0, 0, 1, 4000).value).toBe(0.5);
  });
});

describe("escapeFraction", () => {
  it("is zero with no gravity and near light speed at the ceiling", () => {
    expect(escapeFraction(0)).toBe(0);
    expect(escapeFraction(MAX_COMPACTNESS)).toBeCloseTo(0.9747, 3);
  });

  it("never exceeds the speed of light", () => {
    for (const x of [0, 0.5, 0.95, 1, 4]) {
      expect(escapeFraction(x)).toBeLessThanOrEqual(1);
    }
  });

  it("rises with compactness", () => {
    expect(escapeFraction(0.8)).toBeGreaterThan(escapeFraction(0.2));
  });
});
