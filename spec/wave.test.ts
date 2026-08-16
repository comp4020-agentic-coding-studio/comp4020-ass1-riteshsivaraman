import { describe, expect, it } from "vitest";
import { BASE_CRESTS, crestsForRedshift, sineWavePath } from "../wave";
import { compactnessToRedshift } from "../redshift";

describe("sineWavePath", () => {
  it("starts at the left edge and ends at the right", () => {
    const d = sineWavePath(400, 40, 4);
    expect(d.startsWith("M0 ")).toBe(true);
    const lastX = Number(d.split("L").at(-1)!.split(" ")[0]);
    expect(lastX).toBeCloseTo(400, 1);
  });

  it("stays inside the height it was given", () => {
    const d = sineWavePath(400, 40, 6);
    const ys = d
      .split(/[ML]/)
      .filter(Boolean)
      .map((pair) => Number(pair.trim().split(" ")[1]));
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(40);
  });

  it("draws more points for more crests, so a stretched wave is not coarser", () => {
    const few = sineWavePath(400, 40, 2).split("L").length;
    const many = sineWavePath(400, 40, 9).split("L").length;
    expect(many).toBeGreaterThan(few);
  });

  it("still produces a drawable path when the wave is stretched past one cycle", () => {
    // At the slider's ceiling there is barely more than a quarter of a crest
    // across the whole width. It still has to render as a line, not vanish.
    const d = sineWavePath(400, 40, 0.2);
    expect(d).toMatch(/^M0 /);
    expect(d.split("L").length).toBeGreaterThan(2);
  });

  it("never emits NaN", () => {
    for (const crests of [0, 0.01, 1, 9, 100]) {
      expect(sineWavePath(400, 40, crests)).not.toMatch(/NaN/);
    }
  });
});

describe("crestsForRedshift", () => {
  it("is the base count when nothing is shifted", () => {
    expect(crestsForRedshift(0)).toBe(BASE_CRESTS);
  });

  it("halves the crests when the wavelength doubles", () => {
    expect(crestsForRedshift(1)).toBeCloseTo(BASE_CRESTS / 2, 10);
  });

  it("falls as gravity rises, which is the whole picture", () => {
    let previous = Infinity;
    for (let x = 0; x <= 0.95; x += 0.05) {
      const crests = crestsForRedshift(compactnessToRedshift(x));
      expect(crests).toBeLessThan(previous);
      previous = crests;
    }
  });
});
