// Wiring. Takes a document, reads controls, writes attributes — all the
// physics and all the colour come from the DOM-free modules next door.
//
// `init` takes the document rather than reaching for the global so the whole
// thing can be driven from a test against the built page, without a browser.

import {
  EMITTED_NM,
  compactnessToRedshift,
  observedWavelength,
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

function formatNm(nm: number): string {
  return nm >= 1000 ? Math.round(nm).toLocaleString("en-AU") : nm.toFixed(0);
}
