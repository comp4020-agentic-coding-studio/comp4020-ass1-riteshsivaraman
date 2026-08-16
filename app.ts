// Wiring. Takes a document, reads controls, writes attributes — all the
// physics and all the colour come from the DOM-free modules next door.
//
// `init` takes the document rather than reaching for the global so the whole
// thing can be driven from a test against the built page, without a browser.

import {
  BODIES,
  EMITTED_NM,
  MAX_RADII,
  MIN_RADII,
  compactnessOf,
  compactnessToRedshift,
  observedWavelength,
  redshiftBetweenRadii,
} from "./redshift";
import { isVisible, spectrumPosition, wavelengthToCss } from "./spectrum";
import { BASE_CRESTS, crestsForRedshift, sineWavePath } from "./wave";

const WAVE_WIDTH = 400;
const WAVE_HEIGHT = 44;

/** What a wave is drawn in once its colour has left the visible band. Not a
 *  colour — deliberately a non-colour, so the crest spacing stays readable
 *  while the page says the light itself is gone. */
const BEYOND_VISIBLE_STROKE = "rgb(122 134 170)";

export function init(doc: Document): void {
  wireExperiment(doc);
  wirePrediction(doc);
  wireObservers(doc);
  wireBodies(doc);
}

// --- Simulation 1: the core interaction ------------------------------------

function wireExperiment(doc: Document): void {
  const slider = doc.querySelector<HTMLInputElement>("#compactness");
  if (!slider) return;

  const emittedPath = doc.querySelector<SVGPathElement>("#wave-emitted");
  const observedPath = doc.querySelector<SVGPathElement>("#wave-observed");
  const observedLabel = doc.querySelector<HTMLElement>("#wave-observed-label");
  const marker = doc.querySelector<HTMLElement>("#spectrum-marker");
  const outWavelength = doc.querySelector<HTMLElement>("#out-wavelength");
  const outZ = doc.querySelector<HTMLElement>("#out-z");
  const status = doc.querySelector<HTMLElement>("#visibility-status");

  // The emitted trace never changes: same star, same 500nm, every time.
  emittedPath?.setAttribute(
    "d",
    sineWavePath(WAVE_WIDTH, WAVE_HEIGHT, BASE_CRESTS),
  );
  emittedPath?.setAttribute("stroke", wavelengthToCss(EMITTED_NM));

  const update = () => {
    const x = Number(slider.value);
    const z = compactnessToRedshift(x);
    const observedNm = observedWavelength(EMITTED_NM, z);
    const visible = isVisible(observedNm);
    const position = spectrumPosition(observedNm);

    observedPath?.setAttribute(
      "d",
      sineWavePath(WAVE_WIDTH, WAVE_HEIGHT, crestsForRedshift(z)),
    );
    observedPath?.setAttribute(
      "stroke",
      visible ? wavelengthToCss(observedNm) : BEYOND_VISIBLE_STROKE,
    );

    if (observedLabel) observedLabel.textContent = `${formatNm(observedNm)} nm`;

    if (marker) marker.style.left = `${(position * 100).toFixed(2)}%`;

    if (outWavelength) {
      outWavelength.textContent = `${formatNm(observedNm)} nm`;
      outWavelength.dataset.observedNm = String(observedNm);
    }

    if (outZ) {
      outZ.textContent = z.toFixed(2);
      outZ.dataset.redshiftZ = String(z);
    }

    if (status) {
      status.dataset.spectrumPos = position.toFixed(4);
      status.textContent = describe(x, observedNm, visible);
    }
  };

  slider.addEventListener("input", update);
  update();
}

/** The sentence under the readout. It carries the meaning for anyone who
 *  cannot see the colours at all, so it has to say what happened, not just
 *  restate the number above it. */
function describe(x: number, observedNm: number, visible: boolean): string {
  if (x === 0) return "No gravity, no shift — this is the green it left with.";
  if (!visible) {
    return `Past the red end of the spectrum at ${formatNm(
      observedNm,
    )} nm. The star is still shining; you simply cannot see it any more.`;
  }
  if (observedNm > 620) {
    return "Deep red, and close to the edge of what an eye can register.";
  }
  return "Stretched toward red, and still visible.";
}

// --- Prediction -------------------------------------------------------------

const VERDICTS: Record<string, string> = {
  same: "A reasonable guess — it's what everyday experience suggests. Run the experiment and see.",
  dimmer:
    "Close, and the most interesting wrong answer: distant stars do look dimmer, but that's distance, not gravity. Gravity does something else to the light.",
  redder:
    "That's it. Light climbing out of gravity stretches toward red — and the experiment below shows how far.",
  bluer:
    "The right idea in the wrong direction. Light falling *inward* blueshifts; this light is climbing out.",
};

function wirePrediction(doc: Document): void {
  const options = [...doc.querySelectorAll<HTMLButtonElement>(".option")];
  const verdict = doc.querySelector<HTMLElement>("#verdict");
  if (options.length === 0 || !verdict) return;

  for (const option of options) {
    option.setAttribute("aria-pressed", "false");
    option.addEventListener("click", () => {
      for (const other of options) other.setAttribute("aria-pressed", "false");
      option.setAttribute("aria-pressed", "true");
      verdict.textContent = VERDICTS[option.dataset.choice ?? ""] ?? "";
      verdict.hidden = false;
    });
  }
}

// --- Simulation 2: two positions in the same well ---------------------------

// The diagram's distance axis, in viewBox units: r = 1 sits at the horizon
// line, r = MAX_RADII at the right-hand tick.
const AXIS_LEFT = 40;
const AXIS_RIGHT = 370;

function xForRadius(r: number): number {
  const t = (r - 1) / (MAX_RADII - 1);
  return AXIS_LEFT + t * (AXIS_RIGHT - AXIS_LEFT);
}

function wireObservers(doc: Document): void {
  const emit = doc.querySelector<HTMLInputElement>("#r-emit");
  const recv = doc.querySelector<HTMLInputElement>("#r-recv");
  if (!emit || !recv) return;

  const ray = doc.querySelector<SVGPathElement>("#observer-ray");
  const emitMark = doc.querySelector<SVGGElement>("#observer-emit");
  const recvMark = doc.querySelector<SVGGElement>("#observer-recv");
  const emitValue = doc.querySelector<HTMLElement>("#r-emit-value");
  const recvValue = doc.querySelector<HTMLElement>("#r-recv-value");
  const outZ = doc.querySelector<HTMLElement>("#out-pair-z");
  const outNm = doc.querySelector<HTMLElement>("#out-pair-nm");
  const status = doc.querySelector<HTMLElement>("#pair-status");

  const update = () => {
    const rEmit = clampRadius(Number(emit.value));
    const rRecv = clampRadius(Number(recv.value));
    const z = redshiftBetweenRadii(rEmit, rRecv);
    const nm = observedWavelength(EMITTED_NM, z);

    if (emitValue) emitValue.textContent = rEmit.toFixed(2);
    if (recvValue) recvValue.textContent = rRecv.toFixed(2);

    const xEmit = xForRadius(rEmit);
    const xRecv = xForRadius(rRecv);
    emitMark?.setAttribute("transform", `translate(${xEmit.toFixed(1)} 90)`);
    recvMark?.setAttribute("transform", `translate(${xRecv.toFixed(1)} 90)`);
    ray?.setAttribute("d", `M${xEmit.toFixed(1)} 90 L${xRecv.toFixed(1)} 90`);
    ray?.setAttribute(
      "stroke",
      isVisible(nm) ? wavelengthToCss(nm) : BEYOND_VISIBLE_STROKE,
    );

    if (outZ) {
      outZ.textContent = formatSigned(z);
      outZ.dataset.pairZ = String(z);
    }
    if (outNm) {
      outNm.textContent = `${formatNm(nm)} nm`;
      outNm.dataset.pairNm = String(nm);
    }
    if (status) status.textContent = describePair(rEmit, rRecv, nm);
  };

  emit.addEventListener("input", update);
  recv.addEventListener("input", update);
  update();
}

function clampRadius(r: number): number {
  return Math.min(Math.max(r, MIN_RADII), MAX_RADII);
}

function describePair(rEmit: number, rRecv: number, nm: number): string {
  if (Math.abs(rEmit - rRecv) < 1e-6) {
    return "Same depth, same colour. With nothing to climb, there is no shift at all.";
  }
  if (rRecv > rEmit) {
    const gone = !isVisible(nm) ? " Far enough that it is no longer visible." : "";
    return `Climbing outward, so the light arrives redder than it left.${gone}`;
  }
  return "Falling inward, so the light arrives bluer than it left — the same effect, run backwards.";
}

// --- Simulation 3: objects that actually exist ------------------------------

function wireBodies(doc: Document): void {
  const picks = [...doc.querySelectorAll<HTMLButtonElement>(".body-pick")];
  if (picks.length === 0) return;

  const name = doc.querySelector<HTMLElement>("#body-name");
  const blurb = doc.querySelector<HTMLElement>("#body-blurb");
  const outZ = doc.querySelector<HTMLElement>("#body-z");
  const outNm = doc.querySelector<HTMLElement>("#body-nm");
  const outX = doc.querySelector<HTMLElement>("#body-x");
  const note = doc.querySelector<HTMLElement>("#body-note");

  const select = (id: string) => {
    const body = BODIES.find((b) => b.id === id);
    if (!body) return;

    for (const pick of picks) {
      pick.setAttribute("aria-pressed", String(pick.dataset.body === id));
    }

    const x = compactnessOf(body.massKg, body.radiusM);
    const z = compactnessToRedshift(x);
    const nm = observedWavelength(EMITTED_NM, z);

    if (name) name.textContent = body.name;
    if (blurb) blurb.textContent = body.blurb;
    if (outZ) {
      outZ.textContent = formatScientific(z);
      outZ.dataset.bodyZ = String(z);
    }
    if (outNm) outNm.textContent = `${nm.toFixed(nm - EMITTED_NM < 1 ? 4 : 1)} nm`;
    if (outX) outX.textContent = formatScientific(x);
    if (note) note.textContent = describeBody(z);
  };

  for (const pick of picks) {
    pick.addEventListener("click", () => select(pick.dataset.body ?? ""));
  }

  select(
    picks.find((p) => p.getAttribute("aria-pressed") === "true")?.dataset.body ??
      BODIES[0].id,
  );
}

function describeBody(z: number): string {
  if (z < 1e-8) {
    return "Far too small to see, and still large enough that satellite clocks have to correct for it.";
  }
  if (z < 1e-3) {
    return "Invisible to the eye, comfortably measurable with a spectrograph.";
  }
  return "Large enough that the shift is a real change in colour, not a correction.";
}

// --- Formatting -------------------------------------------------------------

function formatNm(nm: number): string {
  return nm >= 1000 ? Math.round(nm).toLocaleString("en-AU") : nm.toFixed(0);
}

function formatSigned(z: number): string {
  if (Math.abs(z) < 5e-3) return "0.00";
  return `${z > 0 ? "+" : "−"}${Math.abs(z).toFixed(2)}`;
}

/** Small numbers as a mantissa and a superscript exponent, because
 *  "0.000000000696" tells the reader nothing at a glance. */
function formatScientific(value: number): string {
  if (value === 0) return "0";
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / 10 ** exponent;
  if (exponent >= -2 && exponent <= 2) return value.toPrecision(3);
  return `${mantissa.toFixed(2)} × 10${superscript(exponent)}`;
}

const SUPERSCRIPTS = "⁰¹²³⁴⁵⁶⁷⁸⁹";

function superscript(n: number): string {
  const digits = Math.abs(n)
    .toString()
    .split("")
    .map((d) => SUPERSCRIPTS[Number(d)])
    .join("");
  return n < 0 ? `⁻${digits}` : digits;
}
