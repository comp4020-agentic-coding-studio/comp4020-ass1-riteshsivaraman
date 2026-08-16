import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it } from "vitest";
import { init } from "../app";

// The graded core interaction, asserted against the page that actually ships.
//
// The markup comes from built dist/, so this fails if the build stops emitting
// the controls. The behaviour comes from calling init() on that document
// directly, which keeps the test honest about the wiring without needing a
// browser to run ES modules.

const html = readFileSync(resolve("dist/index.html"), "utf8");

let doc: Document;
let window: JSDOM["window"];

function drive(value: number): void {
  const slider = doc.querySelector("#compactness") as HTMLInputElement;
  slider.value = String(value);
  slider.dispatchEvent(new window.Event("input", { bubbles: true }));
}

function observedNm(): number {
  return Number(
    doc.querySelector<HTMLElement>("#out-wavelength")!.dataset.observedNm,
  );
}

function spectrumPos(): number {
  return Number(
    doc.querySelector<HTMLElement>("#visibility-status")!.dataset.spectrumPos,
  );
}

beforeEach(() => {
  const dom = new JSDOM(html);
  window = dom.window;
  doc = dom.window.document as unknown as Document;
  init(doc);
});

describe("the slider exists and is usable", () => {
  it("is a range input", () => {
    const slider = doc.querySelector<HTMLInputElement>("#compactness");
    expect(slider).toBeTruthy();
    expect(slider!.type).toBe("range");
  });

  it("has a label a screen reader can reach", () => {
    const label = doc.querySelector('label[for="compactness"]');
    expect(label).toBeTruthy();
    expect(label!.textContent!.trim().length).toBeGreaterThan(0);
  });

  it("stops short of the horizon, where the redshift would be infinite", () => {
    const slider = doc.querySelector<HTMLInputElement>("#compactness")!;
    expect(Number(slider.max)).toBeLessThan(1);
  });
});

describe("driving the slider changes the light", () => {
  it("starts at the emitted wavelength", () => {
    expect(observedNm()).toBeCloseTo(500, 6);
  });

  it("reports a longer wavelength at higher gravity", () => {
    drive(0);
    const low = observedNm();
    drive(0.6);
    const high = observedNm();
    expect(high).toBeGreaterThan(low);
  });

  it("moves the spectrum marker to the right as the wavelength grows", () => {
    drive(0);
    const low = spectrumPos();
    drive(0.4);
    const high = spectrumPos();
    expect(high).toBeGreaterThan(low);
  });

  it("changes the colour of the received wave", () => {
    drive(0);
    const cool = doc.querySelector("#wave-observed")!.getAttribute("stroke");
    drive(0.45);
    const warm = doc.querySelector("#wave-observed")!.getAttribute("stroke");
    expect(warm).not.toBe(cool);
  });

  it("stretches the received wave so fewer crests fit across it", () => {
    drive(0);
    const dense = doc.querySelector("#wave-observed")!.getAttribute("d")!.length;
    drive(0.8);
    const sparse = doc.querySelector("#wave-observed")!.getAttribute("d")!.length;
    expect(sparse).toBeLessThan(dense);
  });

  it("leaves the emitted wave alone — the star never changes", () => {
    const before = doc.querySelector("#wave-emitted")!.getAttribute("d");
    drive(0.9);
    expect(doc.querySelector("#wave-emitted")!.getAttribute("d")).toBe(before);
  });

  it("updates the redshift readout", () => {
    drive(0.75);
    expect(
      Number(doc.querySelector<HTMLElement>("#out-z")!.dataset.redshiftZ),
    ).toBeCloseTo(1, 6);
  });
});

describe("the moment the light leaves the visible band", () => {
  it("says so in words, not only in colour", () => {
    // The page's central claim has to reach someone who cannot see the
    // spectrum bar at all.
    drive(0.9);
    const status = doc.querySelector("#visibility-status")!.textContent!;
    expect(status.toLowerCase()).toMatch(/cannot see|past the red/);
  });

  it("pins the marker to the end of the bar rather than losing it", () => {
    drive(0.95);
    expect(spectrumPos()).toBe(1);
  });

  it("keeps the wave visible as a shape once its colour is gone", () => {
    // Black-on-black would hide the crest spacing, which is the one thing
    // still worth looking at up here.
    drive(0.95);
    const stroke = doc.querySelector("#wave-observed")!.getAttribute("stroke");
    expect(stroke).not.toBe("rgb(0 0 0)");
  });

  it("never writes NaN or Infinity into the page", () => {
    for (const x of [0, 0.5, 0.95]) {
      drive(x);
      expect(Number.isFinite(observedNm())).toBe(true);
      expect(doc.querySelector("#out-z")!.textContent).not.toMatch(/NaN|Inf/);
    }
  });
});
