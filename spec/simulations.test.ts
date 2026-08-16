import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it } from "vitest";
import { idealExponent, init } from "../app";
import { BODIES, compactnessOf, compactnessToRedshift } from "../redshift";

// Simulations 2 and 3, against the built page. Same rule as the core: a new
// interaction lands with its sensor, so a later change cannot quietly break
// it while I am looking somewhere else.

const html = readFileSync(resolve("dist/index.html"), "utf8");

let doc: Document;
let window: JSDOM["window"];

beforeEach(() => {
  const dom = new JSDOM(html);
  window = dom.window;
  doc = dom.window.document as unknown as Document;
  init(doc);
});

function setRange(id: string, value: number): void {
  const input = doc.querySelector(id) as HTMLInputElement;
  input.value = String(value);
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
}

function click(selector: string): void {
  (doc.querySelector(selector) as HTMLElement).dispatchEvent(
    new window.window.MouseEvent("click", { bubbles: true }),
  );
}

function pairZ(): number {
  return Number(doc.querySelector<HTMLElement>("#out-pair-z")!.dataset.pairZ);
}

describe("prediction", () => {
  it("keeps every option unselected until one is chosen", () => {
    for (const option of doc.querySelectorAll(".option")) {
      expect(option.getAttribute("aria-pressed")).toBe("false");
    }
    expect(doc.querySelector<HTMLElement>("#verdict")!.hidden).toBe(true);
  });

  it("responds to a choice without grading it", () => {
    click('[data-choice="dimmer"]');
    const verdict = doc.querySelector<HTMLElement>("#verdict")!;
    expect(verdict.hidden).toBe(false);
    expect(verdict.textContent!.length).toBeGreaterThan(20);
    expect(doc.querySelector('[data-choice="dimmer"]')!.getAttribute("aria-pressed")).toBe("true");
  });

  it("only ever has one option selected", () => {
    click('[data-choice="same"]');
    click('[data-choice="redder"]');
    const pressed = [...doc.querySelectorAll(".option")].filter(
      (o) => o.getAttribute("aria-pressed") === "true",
    );
    expect(pressed).toHaveLength(1);
    expect(pressed[0].getAttribute("data-choice")).toBe("redder");
  });

  it("says something different for each answer", () => {
    const seen = new Set<string>();
    for (const choice of ["same", "dimmer", "redder", "bluer"]) {
      click(`[data-choice="${choice}"]`);
      seen.add(doc.querySelector("#verdict")!.textContent!);
    }
    expect(seen.size).toBe(4);
  });
});

describe("two observers", () => {
  it("redshifts when the receiver is higher than the emitter", () => {
    setRange("#r-emit", 2);
    setRange("#r-recv", 12);
    expect(pairZ()).toBeGreaterThan(0);
  });

  it("blueshifts when the receiver is deeper than the emitter", () => {
    // The behaviour that distinguishes this simulation from the slider. If
    // this ever clamps to zero, the section has stopped teaching its point.
    setRange("#r-emit", 12);
    setRange("#r-recv", 2);
    expect(pairZ()).toBeLessThan(0);
    expect(
      Number(doc.querySelector<HTMLElement>("#out-pair-nm")!.dataset.pairNm),
    ).toBeLessThan(500);
  });

  it("shows no shift at all when both sit at the same depth", () => {
    setRange("#r-emit", 5);
    setRange("#r-recv", 5);
    expect(pairZ()).toBeCloseTo(0, 10);
    expect(doc.querySelector("#pair-status")!.textContent).toMatch(/no shift/i);
  });

  it("moves the markers along the axis in the order the radii imply", () => {
    setRange("#r-emit", 2);
    setRange("#r-recv", 10);
    const x = (id: string) =>
      Number(
        doc.querySelector(id)!.getAttribute("transform")!.match(/translate\(([-\d.]+)/)![1],
      );
    expect(x("#observer-recv")).toBeGreaterThan(x("#observer-emit"));
  });

  it("describes the direction in words, not only in the diagram", () => {
    setRange("#r-emit", 2);
    setRange("#r-recv", 12);
    expect(doc.querySelector("#pair-status")!.textContent).toMatch(/redder/i);
    setRange("#r-emit", 12);
    setRange("#r-recv", 2);
    expect(doc.querySelector("#pair-status")!.textContent).toMatch(/bluer/i);
  });
});

describe("the beam depicts the shift, rather than reporting it", () => {
  const stop = (id: string) => doc.querySelector(id)!.getAttribute("stop-color");

  it("gives the beam real area, not a hairline", () => {
    // The original version encoded the entire result in the hue of a 3px line
    // and nobody could see it working. Meaning goes on prominent properties.
    const height = Number(doc.querySelector("#observer-beam")!.getAttribute("height"));
    expect(height).toBeGreaterThan(12);
  });

  it("runs green at the emitting end and shifted at the receiving end", () => {
    setRange("#r-emit", 1.5);
    setRange("#r-recv", 12);
    expect(stop("#beam-from")).not.toBe(stop("#beam-to"));
  });

  it("reverses the gradient when the light travels inward", () => {
    // The gradient follows the direction of travel, so the emitted colour is
    // always at the emitting end regardless of which side that is.
    setRange("#r-emit", 1.5);
    setRange("#r-recv", 12);
    const outwardStart = stop("#beam-from");
    setRange("#r-emit", 12);
    setRange("#r-recv", 1.5);
    expect(stop("#beam-to")).toBe(outwardStart);
  });

  it("never fades the beam out", () => {
    // Redshift does not dim light. A fading beam would teach the exact
    // misconception option B of the prediction quiz exists to correct.
    setRange("#r-emit", 1.05);
    setRange("#r-recv", 12);
    const beam = doc.querySelector("#observer-beam")!;
    expect(beam.getAttribute("opacity")).toBeNull();
    for (const id of ["#beam-from", "#beam-to"]) {
      expect(doc.querySelector(id)!.getAttribute("stop-opacity")).toBeNull();
    }
  });

  it("spans the gap between the two observers", () => {
    setRange("#r-emit", 2);
    setRange("#r-recv", 10);
    const beam = doc.querySelector("#observer-beam")!;
    const x = Number(beam.getAttribute("x"));
    const width = Number(beam.getAttribute("width"));
    const at = (id: string) =>
      Number(doc.querySelector(id)!.getAttribute("transform")!.match(/translate\(([-\d.]+)/)![1]);
    expect(x).toBeCloseTo(at("#observer-emit"), 0);
    expect(x + width).toBeCloseTo(at("#observer-recv"), 0);
  });
});

describe("animate toggles", () => {
  const boxes = () => [...doc.querySelectorAll<HTMLInputElement>("[data-animate]")];

  it("offers one on every simulation", () => {
    expect(boxes()).toHaveLength(doc.querySelectorAll("[data-sim]").length);
  });

  it("points each toggle at a control that exists", () => {
    for (const box of boxes()) {
      expect(doc.querySelector(`#${box.dataset.animate}`)).toBeTruthy();
    }
  });

  it("starts off, so nothing moves until it is asked to", () => {
    for (const box of boxes()) expect(box.checked).toBe(false);
  });

  it("switches itself off when you take hold of the control", () => {
    // A slider that pulls back against the hand is worse than no animation.
    for (const box of boxes()) {
      const input = doc.querySelector<HTMLInputElement>(`#${box.dataset.animate}`)!;
      box.checked = true;
      input.dispatchEvent(new window.Event("pointerdown", { bubbles: true }));
      expect(box.checked).toBe(false);
    }
  });
});

describe("reveals degrade safely", () => {
  it("shows every section when there is no IntersectionObserver", () => {
    // jsdom has none, which is exactly the fallback path. If this inverted,
    // the whole page would ship invisible to anyone whose browser or settings
    // took that path too.
    const hidden = [...doc.querySelectorAll(".reveal")].filter(
      (el) => !el.classList.contains("is-in"),
    );
    expect(hidden).toHaveLength(0);
  });
});

describe("real objects", () => {
  it("starts with exactly one object selected", () => {
    const pressed = [...doc.querySelectorAll(".body-pick")].filter(
      (b) => b.getAttribute("aria-pressed") === "true",
    );
    expect(pressed).toHaveLength(1);
  });

  it("shows a wavelength barely distinguishable from 500nm for Earth", () => {
    click('[data-body="earth"]');
    expect(doc.querySelector("#body-name")!.textContent).toBe("Earth");
    expect(doc.querySelector("#body-nm")!.textContent).toMatch(/^500\./);
  });

  it("reports Sirius B's redshift in the order the 1925 measurement found", () => {
    click('[data-body="sirius-b"]');
    const z = Number(doc.querySelector<HTMLElement>("#body-z")!.dataset.bodyZ);
    expect(z).toBeGreaterThan(2.0e-4);
    expect(z).toBeLessThan(3.5e-4);
  });

  it("formats tiny numbers readably rather than as a run of zeroes", () => {
    click('[data-body="earth"]');
    const text = doc.querySelector("#body-z")!.textContent!;
    expect(text).toMatch(/×\s?10/);
    expect(text).not.toMatch(/0\.0000/);
  });

  it("needs deeper magnification the smaller the shift", () => {
    // A pure function, so it is asserted without racing the zoom animation.
    // Ordering is the claim: Earth's shift needs the most zoom, a neutron
    // star's the least.
    const need = (id: string) => {
      const b = BODIES.find((x) => x.id === id)!;
      return idealExponent(500 * compactnessToRedshift(compactnessOf(b.massKg, b.radiusM)));
    };
    expect(need("earth")).toBeGreaterThan(need("sun"));
    expect(need("sun")).toBeGreaterThan(need("sirius-b"));
    expect(need("sirius-b")).toBeGreaterThan(need("neutron-star"));
    expect(need("neutron-star")).toBeLessThan(1);
  });

  it("colours the observed mark by the wavelength that arrives", () => {
    // The body's own readouts land synchronously; only the zoom level travels.
    const colour = () => doc.querySelector<HTMLElement>("#mark-observed")!.style.background;
    click('[data-body="earth"]');
    const earth = colour();
    click('[data-body="neutron-star"]');
    expect(earth).toBeTruthy();
    expect(colour()).not.toBe(earth);
  });

  it("states the magnification, and drops the claim at 1x", () => {
    const note = () => doc.querySelector("#window-note")!.textContent!;
    setRange("#zoom", 4);
    expect(note()).toMatch(/magnified/);
    setRange("#zoom", 0);
    expect(note()).toMatch(/no magnification/);
  });

  it("shows Earth's shift in the digits instead of rounding it away", () => {
    // Earth shifts 500nm by 3.5e-7nm. A fixed decimal count prints a
    // confident "500 nm" for a number that is not 500.
    click('[data-body="earth"]');
    expect(doc.querySelector("#body-nm")!.textContent).toMatch(/^500\.0+[1-9]/);
  });

  it("gives a visibly bigger shift for a neutron star than for the Sun", () => {
    click('[data-body="sun"]');
    const sun = Number(doc.querySelector<HTMLElement>("#body-z")!.dataset.bodyZ);
    click('[data-body="neutron-star"]');
    const ns = Number(doc.querySelector<HTMLElement>("#body-z")!.dataset.bodyZ);
    expect(ns).toBeGreaterThan(sun * 1000);
  });
});
