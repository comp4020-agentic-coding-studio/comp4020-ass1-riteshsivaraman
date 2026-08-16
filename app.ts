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
import {
  VISIBLE_MAX_NM,
  VISIBLE_MIN_NM,
  isVisible,
  spectrumPosition,
  wavelengthToCss,
} from "./spectrum";
import { BASE_CRESTS, crestsForRedshift, sineWavePath } from "./wave";

const WAVE_WIDTH = 400;
const WAVE_HEIGHT = 44;

/** What light is drawn in once its colour has left the visible band. Not a
 *  colour — deliberately a non-colour, so shape stays readable while the page
 *  says the light itself is gone. */
const BEYOND_VISIBLE = "rgb(122 134 170)";

export function init(doc: Document): void {
  const star = makeStar(doc);
  wireExperiment(doc, star);
  wirePrediction(doc);
  wireObservers(doc);
  wireBodies(doc);
  wireReveals(doc);
  wireParallax(doc);
}

function prefersReducedMotion(doc: Document): boolean {
  return doc.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

// --- The persistent star ----------------------------------------------------
//
// One object the whole page is about, sitting behind everything and reacting to
// the gravity slider. It is what makes the page a place rather than seven boxes.

type Star = (compactness: number, observedNm: number) => void;

function makeStar(doc: Document): Star {
  const svg = doc.querySelector<SVGElement>("#star");
  const core = doc.querySelector<SVGCircleElement>("#star-core");
  const halo = doc.querySelector<SVGCircleElement>("#star-halo");
  const lines = doc.querySelector<SVGGElement>("#star-field-lines");

  return (compactness, observedNm) => {
    const colour = isVisible(observedNm) ? wavelengthToCss(observedNm) : BEYOND_VISIBLE;
    svg?.style.setProperty("--star-color", colour);
    core?.setAttribute("fill", colour);

    // More compact means denser: the core tightens while the field around it
    // deepens. Brightness is left alone — dimming would tell the wrong story.
    core?.setAttribute("r", String(34 - compactness * 13));
    halo?.setAttribute("r", String(150 - compactness * 34));
    lines?.setAttribute("opacity", String(0.85 + compactness * 0.15));
    lines?.setAttribute(
      "transform",
      `translate(200 200) scale(${(1 - compactness * 0.28).toFixed(3)}) translate(-200 -200)`,
    );
  };
}

// --- Simulation 1: the core interaction ------------------------------------

function wireExperiment(doc: Document, star: Star): void {
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
  emittedPath?.setAttribute("d", sineWavePath(WAVE_WIDTH, WAVE_HEIGHT, BASE_CRESTS));
  emittedPath?.setAttribute("stroke", wavelengthToCss(EMITTED_NM));

  const update = () => {
    const x = Number(slider.value);
    const z = compactnessToRedshift(x);
    const observedNm = observedWavelength(EMITTED_NM, z);
    const visible = isVisible(observedNm);
    const position = spectrumPosition(observedNm);
    const colour = visible ? wavelengthToCss(observedNm) : BEYOND_VISIBLE;

    observedPath?.setAttribute(
      "d",
      sineWavePath(WAVE_WIDTH, WAVE_HEIGHT, crestsForRedshift(z)),
    );
    observedPath?.setAttribute("stroke", colour);

    if (observedLabel) observedLabel.textContent = `${formatNm(observedNm)} nm`;
    if (marker) marker.style.left = `${(position * 100).toFixed(2)}%`;

    if (outWavelength) {
      outWavelength.textContent = `${formatNm(observedNm)} nm`;
      outWavelength.dataset.observedNm = String(observedNm);
      outWavelength.style.color = colour;
    }

    if (outZ) {
      outZ.textContent = z.toFixed(2);
      outZ.dataset.redshiftZ = String(z);
    }

    if (status) {
      status.dataset.spectrumPos = position.toFixed(4);
      status.textContent = describe(x, observedNm, visible);
    }

    star(x, observedNm);
  };

  slider.addEventListener("input", update);
  update();

  demonstrate(doc, slider, { from: 0, to: 0.95, period: 7000 });
}

function describe(x: number, observedNm: number, visible: boolean): string {
  if (x === 0) return "No gravity, no shift — this is the green it left with.";
  if (!visible) {
    return `Past the red end of the spectrum at ${formatNm(
      observedNm,
    )} nm. The star is still shining, and just as brightly; you simply cannot see it any more.`;
  }
  if (observedNm > 620) return "Deep red, and close to the edge of what an eye can register.";
  return "Stretched toward red, and still visible.";
}

// --- Self-demonstration -----------------------------------------------------
//
// A simulation that waits to be discovered mostly isn't. Each one plays itself
// once when it first scrolls into view, then hands over the moment the reader
// touches anything. The dashed outline says it is playing, so nobody thinks the
// control is stuck.

function demonstrate(
  doc: Document,
  input: HTMLInputElement,
  { from, to, period }: { from: number; to: number; period: number },
): void {
  const view = doc.defaultView;
  if (!view || prefersReducedMotion(doc) || typeof view.IntersectionObserver !== "function") {
    return;
  }

  let raf = 0;
  let started = 0;
  let running = false;
  let cancelled = false;

  // `cancelled` is separate from `running` on purpose. Touching the control
  // before the demo has begun has to prevent it from ever beginning — with a
  // one-shot listener, an early cancel is simply consumed and the demo takes
  // the control back a moment later, which is worse than never demoing.
  const stop = () => {
    cancelled = true;
    if (!running) return;
    running = false;
    view.cancelAnimationFrame(raf);
    input.classList.remove("is-demoing");
  };

  const frame = (now: number) => {
    if (!running) return;
    if (!started) started = now;
    const t = (now - started) / period;
    if (t >= 1) {
      stop();
      return;
    }
    // Out and back, eased, so it settles where it started rather than
    // stranding the reader at an arbitrary value.
    const swing = (1 - Math.cos(t * 2 * Math.PI)) / 2;
    input.value = String(from + (to - from) * swing);
    input.dispatchEvent(new view.Event("input", { bubbles: true }));
    raf = view.requestAnimationFrame(frame);
  };

  for (const event of ["pointerdown", "keydown", "wheel", "touchstart"]) {
    input.addEventListener(event, stop);
  }

  const observer = new view.IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || running || started || cancelled) continue;
        running = true;
        input.classList.add("is-demoing");
        raf = view.requestAnimationFrame(frame);
        observer.disconnect();
      }
    },
    { threshold: 0.55 },
  );
  observer.observe(input);
}

// --- Prediction -------------------------------------------------------------

const VERDICTS: Record<string, string> = {
  same: "A reasonable guess — it's what everyday experience suggests. Run the experiment and see.",
  dimmer:
    "Close, and the most interesting wrong answer: distant stars do look dimmer, but that's distance, not gravity. Gravity leaves the brightness alone and changes something else.",
  redder:
    "That's it. Light climbing out of gravity stretches toward red — and the experiment below shows how far.",
  bluer:
    "The right idea in the wrong direction. Light falling inward blueshifts; this light is climbing out.",
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

const AXIS_LEFT = 40;
const AXIS_RIGHT = 370;

function xForRadius(r: number): number {
  return AXIS_LEFT + ((r - 1) / (MAX_RADII - 1)) * (AXIS_RIGHT - AXIS_LEFT);
}

function wireObservers(doc: Document): void {
  const emit = doc.querySelector<HTMLInputElement>("#r-emit");
  const recv = doc.querySelector<HTMLInputElement>("#r-recv");
  if (!emit || !recv) return;

  const beam = doc.querySelector<SVGRectElement>("#observer-beam");
  const from = doc.querySelector<SVGStopElement>("#beam-from");
  const to = doc.querySelector<SVGStopElement>("#beam-to");
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
    const arrived = isVisible(nm) ? wavelengthToCss(nm) : BEYOND_VISIBLE;
    const left = wavelengthToCss(EMITTED_NM);

    if (emitValue) emitValue.textContent = rEmit.toFixed(2);
    if (recvValue) recvValue.textContent = rRecv.toFixed(2);

    const xEmit = xForRadius(rEmit);
    const xRecv = xForRadius(rRecv);
    emitMark?.setAttribute("transform", `translate(${xEmit.toFixed(1)} 91)`);
    recvMark?.setAttribute("transform", `translate(${xRecv.toFixed(1)} 91)`);

    // The beam gets area, not a hairline: this is where the physics lives.
    beam?.setAttribute("x", String(Math.min(xEmit, xRecv).toFixed(1)));
    beam?.setAttribute("width", String(Math.max(Math.abs(xRecv - xEmit), 2).toFixed(1)));

    // Colour runs along the direction the light actually travels, so the
    // gradient reverses when the receiver is the deeper of the two.
    const outward = xRecv >= xEmit;
    from?.setAttribute("stop-color", outward ? left : arrived);
    to?.setAttribute("stop-color", outward ? arrived : left);

    if (outZ) {
      outZ.textContent = formatSigned(z);
      outZ.dataset.pairZ = String(z);
      outZ.style.color = arrived;
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

  demonstrate(doc, emit, { from: 6, to: MIN_RADII, period: 6000 });
}

function clampRadius(r: number): number {
  return Math.min(Math.max(r, MIN_RADII), MAX_RADII);
}

function describePair(rEmit: number, rRecv: number, nm: number): string {
  if (Math.abs(rEmit - rRecv) < 1e-6) {
    return "Same depth, same colour. With nothing to climb, there is no shift at all.";
  }
  if (rRecv > rEmit) {
    const gone = isVisible(nm) ? "" : " Far enough that it is no longer visible.";
    return `Climbing outward, so the light arrives redder than it left.${gone}`;
  }
  return "Falling inward, so the light arrives bluer than it left — the same effect, run backwards.";
}

// --- Simulation 3: objects that actually exist ------------------------------

const STRIP_WIDTH = 360;

/** Earth needs roughly 10^9 magnification; that sets the scale's far end. */
const MAX_LOG_MAGNIFICATION = 9;

function clamp01(v: number): number {
  return Math.min(Math.max(v, 0), 1);
}

function wireBodies(doc: Document): void {
  const picks = [...doc.querySelectorAll<HTMLButtonElement>(".body-pick")];
  if (picks.length === 0) return;

  const name = doc.querySelector<HTMLElement>("#body-name");
  const blurb = doc.querySelector<HTMLElement>("#body-blurb");
  const outZ = doc.querySelector<HTMLElement>("#body-z");
  const outNm = doc.querySelector<HTMLElement>("#body-nm");
  const outX = doc.querySelector<HTMLElement>("#body-x");
  const note = doc.querySelector<HTMLElement>("#body-note");
  const observedLine = doc.querySelector<SVGLineElement>("#line-observed");
  const meter = doc.querySelector<SVGRectElement>("#zoom-meter");
  const windowLeft = doc.querySelector<SVGTextElement>("#window-left");
  const windowRight = doc.querySelector<SVGTextElement>("#window-right");
  const windowNote = doc.querySelector<SVGTextElement>("#window-note");

  const select = (id: string) => {
    const body = BODIES.find((b) => b.id === id);
    if (!body) return;

    for (const pick of picks) {
      pick.setAttribute("aria-pressed", String(pick.dataset.body === id));
    }

    const x = compactnessOf(body.massKg, body.radiusM);
    const z = compactnessToRedshift(x);
    const nm = observedWavelength(EMITTED_NM, z);
    const delta = nm - EMITTED_NM;

    // Zoom in until the shift is visible. How far you had to zoom is the
    // point of the section, so it is stated rather than hidden.
    const span = Math.max(delta * 2.5, 1e-9);
    const windowStart = EMITTED_NM - span * 0.2;
    const magnification = (VISIBLE_MAX_NM - VISIBLE_MIN_NM) / span;

    observedLine?.setAttribute("fill", isVisible(nm) ? wavelengthToCss(nm) : BEYOND_VISIBLE);

    // How close this shift is to being visible unaided, on a log scale. A
    // linear window on the visible band cannot do this job: the four objects
    // span nine orders of magnitude, so Earth and Sirius B both collapse onto
    // the same sub-pixel sliver and the picture stops distinguishing them.
    if (meter) {
      const closeness = clamp01(1 - Math.log10(Math.max(magnification, 1)) / MAX_LOG_MAGNIFICATION);
      meter.setAttribute("width", Math.max(closeness * STRIP_WIDTH, 2).toFixed(1));
    }

    if (windowLeft) windowLeft.textContent = `${trimNm(windowStart)} nm`;
    if (windowRight) windowRight.textContent = `${trimNm(windowStart + span)} nm`;
    if (windowNote) {
      windowNote.textContent =
        magnification < 2
          ? "no magnification needed — this shift is visible on its own"
          : `magnified ${formatScientific(magnification)}× to make the shift visible`;
    }

    if (name) name.textContent = body.name;
    if (blurb) blurb.textContent = body.blurb;
    if (outZ) {
      outZ.textContent = formatScientific(z);
      outZ.dataset.bodyZ = String(z);
    }
    if (outNm) outNm.textContent = `${trimNm(nm)} nm`;
    if (outX) outX.textContent = formatScientific(x);
    if (note) note.textContent = describeBody(z);
  };

  for (const pick of picks) {
    pick.addEventListener("click", () => select(pick.dataset.body ?? ""));
  }

  select(
    picks.find((p) => p.getAttribute("aria-pressed") === "true")?.dataset.body ?? BODIES[0].id,
  );
}

function describeBody(z: number): string {
  if (z < 1e-8) {
    return "Far too small to see, and still large enough that satellite clocks have to correct for it.";
  }
  if (z < 1e-3) return "Invisible to the eye, comfortably measurable with a spectrograph.";
  return "Large enough that the shift is a real change in colour, not a correction.";
}

// --- Ambient: reveals and parallax ------------------------------------------

function wireReveals(doc: Document): void {
  const view = doc.defaultView;
  const targets = [...doc.querySelectorAll<HTMLElement>(".reveal")];
  if (!view || targets.length === 0) return;

  // With no observer available, show everything rather than hiding it: the
  // page must never depend on JS to be readable.
  if (typeof view.IntersectionObserver !== "function" || prefersReducedMotion(doc)) {
    for (const target of targets) target.classList.add("is-in");
    return;
  }

  const observer = new view.IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.12 },
  );
  for (const target of targets) observer.observe(target);
}

function wireParallax(doc: Document): void {
  const view = doc.defaultView;
  const layers = [...doc.querySelectorAll<HTMLElement>(".sky__layer")];
  const star = doc.querySelector<SVGElement>("#star");
  if (!view || prefersReducedMotion(doc)) return;

  let queued = false;
  const apply = () => {
    queued = false;
    const y = view.scrollY;
    for (const layer of layers) {
      const depth = Number(layer.dataset.depth ?? 0.1);
      layer.style.transform = `translate3d(0, ${(-y * depth).toFixed(1)}px, 0)`;
    }
    if (star) {
      // The star recedes as you travel down the page, so scrolling reads as
      // moving away from it rather than as scrolling a document.
      const progress = Math.min(y / (view.innerHeight * 3), 1);
      star.style.transform = `translate3d(0, ${(-y * 0.05).toFixed(1)}px, 0) scale(${(
        1 - progress * 0.45
      ).toFixed(3)})`;
      star.style.opacity = String(0.95 - progress * 0.35);
    }
  };

  view.addEventListener(
    "scroll",
    () => {
      if (queued) return;
      queued = true;
      view.requestAnimationFrame(apply);
    },
    { passive: true },
  );
  apply();
}

// --- Formatting -------------------------------------------------------------

function formatNm(nm: number): string {
  return nm >= 1000 ? Math.round(nm).toLocaleString("en-AU") : nm.toFixed(0);
}

/**
 * A wavelength near 500nm, shown to enough decimals that the shift is actually
 * visible in the digits.
 *
 * A fixed number of decimals cannot do this: Earth's shift is 3.5e-7 nm, so
 * anything under nine decimal places rounds it away and prints a confident
 * "500 nm" for a number that is not 500. The test caught exactly that.
 */
function trimNm(nm: number): string {
  const delta = Math.abs(nm - EMITTED_NM);
  if (delta === 0) return "500";
  const decimals = Math.min(Math.max(Math.ceil(-Math.log10(delta)) + 2, 2), 12);
  return nm.toFixed(decimals);
}

function formatSigned(z: number): string {
  if (Math.abs(z) < 5e-3) return "0.00";
  return `${z > 0 ? "+" : "−"}${Math.abs(z).toFixed(2)}`;
}

/** Small and large numbers as a mantissa and a superscript exponent, because
 *  "0.000000000696" tells the reader nothing at a glance. */
function formatScientific(value: number): string {
  if (value === 0) return "0";
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / 10 ** exponent;
  if (exponent >= -2 && exponent <= 2) return Number(value.toPrecision(3)).toString();
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
