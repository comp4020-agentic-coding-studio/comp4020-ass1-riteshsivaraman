// `pnpm check:visual` — the advisory sensor.
//
// Two jobs:
//
//   1. Screenshot the built site at both viewports it will be marked at, and
//      run an axe-core accessibility scan over each.
//   2. Film each simulation: sweep its control across its range and tile the
//      frames into one filmstrip image.
//
// Job 2 exists because job 1 alone produced a page that passed every check and
// was completely lifeless. A screenshot is a frozen instant; a page whose only
// sensor is a frozen instant will be built as a frozen instant. See "The
// stillness failure" in CLAUDE.md.
//
// Still advisory: it needs a browser binary, and it tells me whether the layout
// broke, never whether the design is good.

import { readFileSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";

const DIST = resolve("dist");
const OUT = resolve("screenshots");

const VIEWPORTS = [
  { name: "desktop", width: 1920, height: 1080 },
  { name: "phone", width: 390, height: 844 },
] as const;

const FRAMES = 5;

/** The floor for text a person is expected to read, at the phone viewport. */
const MIN_LEGIBLE_PX = 11;

const TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

// Serve dist/ rather than opening file:// — module scripts and fetches behave
// differently under file://, so this measures what actually ships.
const server = createServer((req, res) => {
  const path = (req.url ?? "/").split("?")[0];
  const file = join(DIST, path === "/" ? "index.html" : path);
  try {
    const body = readFileSync(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});

await new Promise<void>((done) => server.listen(0, done));
const address = server.address();
const port = typeof address === "object" && address ? address.port : 0;
const url = `http://localhost:${port}/`;

mkdirSync(OUT, { recursive: true });
const axe = readFileSync(resolve("node_modules/axe-core/axe.min.js"), "utf8");

const browser = await chromium.launch();
let violationCount = 0;

for (const viewport of VIEWPORTS) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
  });
  await page.goto(url, { waitUntil: "networkidle" });

  await page.screenshot({
    path: join(OUT, `index-${viewport.name}.png`),
    fullPage: true,
  });

  console.log(`\n${viewport.name} (${viewport.width}x${viewport.height})`);
  console.log(`  page       → screenshots/index-${viewport.name}.png`);

  // Every simulation gets filmed, enumerated from the page rather than from a
  // list here. A hand-maintained list is how simulation 3 went unfilmed while
  // its main mark was invisible and its zoom view never moved.
  const sims = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-sim]")].map((section) => ({
      name: section.dataset.sim!,
      steps: section.querySelectorAll("[data-sim-step]").length,
      hasControl: Boolean(section.querySelector("[data-sim-control]")),
    })),
  );

  for (const sim of sims) {
    const section = `[data-sim="${sim.name}"]`;
    const frames: string[] = [];
    const labels: string[] = [];

    // Scroll the section in so its reveal has fired, then take the controls
    // away from the self-demo through the same path a reader would — otherwise
    // the demo keeps animating and the filmstrip documents the demo rather
    // than the sweep it claims to be showing.
    await page.locator(section).scrollIntoViewIfNeeded();
    await page.evaluate((sel) => {
      document
        .querySelector(`${sel} [data-sim-control]`)
        ?.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    }, section);
    await page.waitForTimeout(700);

    const count = sim.hasControl ? FRAMES : sim.steps;
    for (let i = 0; i < count; i++) {
      const label = await page.evaluate(
        ({ sel, index, total, sweep }) => {
          if (sweep) {
            const input = document.querySelector(
              `${sel} [data-sim-control]`,
            ) as HTMLInputElement;
            const min = Number(input.min);
            const max = Number(input.max);
            const t = index / (total - 1);
            input.value = String(min + (max - min) * t);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            return `${input.id} = ${Number(input.value).toFixed(2)}`;
          }
          const step = [...document.querySelectorAll<HTMLElement>(`${sel} [data-sim-step]`)][
            index
          ];
          step.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          return step.textContent?.trim() ?? String(index);
        },
        { sel: section, index: i, total: count, sweep: sim.hasControl },
      );

      // Let transitions settle, so a frame shows a state the page actually
      // rests on rather than one caught mid-ease.
      await page.waitForTimeout(450);
      frames.push((await page.locator(section).screenshot()).toString("base64"));
      labels.push(label);
    }

    const path = join(OUT, `film-${sim.name}-${viewport.name}.png`);
    await composeFilmstrip(browser, frames, labels, path);
    console.log(`  filmstrip  → screenshots/film-${sim.name}-${viewport.name}.png`);
  }

  // Does every marked element actually occupy pixels? Attribute assertions
  // cannot see this: an SVG filter on a zero-width bounding box yields an
  // empty filter region and the element silently disappears while every
  // attribute on it stays correct.
  const invisible = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-mark]")]
      .map((el) => {
        const box = el.getBoundingClientRect();
        return { id: el.id || el.className, w: box.width, h: box.height };
      })
      .filter((m) => m.w < 1 || m.h < 1),
  );
  if (invisible.length === 0) {
    console.log("  marks: all rendered");
  } else {
    violationCount += invisible.length;
    for (const m of invisible) {
      console.log(`  MARK NOT RENDERED: #${m.id} is ${m.w.toFixed(1)}x${m.h.toFixed(1)}`);
    }
  }

  // Is every label big enough to read? SVG text scales with its viewBox, so
  // its computed font-size is not the size anyone actually sees.
  const tiny = await page.evaluate((floor) => {
    const found: { text: string; px: number }[] = [];
    for (const el of document.querySelectorAll<Element>("text, p, span, dt, dd, figcaption, label")) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || !el.textContent?.trim()) continue;
      let px = parseFloat(getComputedStyle(el).fontSize);
      const svg = el.closest("svg");
      if (svg) {
        const vb = svg.viewBox.baseVal;
        if (vb?.width) px *= svg.getBoundingClientRect().width / vb.width;
      }
      if (px < floor) found.push({ text: el.textContent.trim().slice(0, 40), px });
    }
    return found;
  }, MIN_LEGIBLE_PX);
  if (tiny.length === 0) {
    console.log(`  text: nothing under ${MIN_LEGIBLE_PX}px`);
  } else {
    violationCount += tiny.length;
    for (const t of tiny.slice(0, 6)) {
      console.log(`  TEXT TOO SMALL (${t.px.toFixed(1)}px): "${t.text}"`);
    }
    if (tiny.length > 6) console.log(`  …and ${tiny.length - 6} more`);
  }

  await page.addScriptTag({ content: axe });
  const results = await page.evaluate(async () => {
    // @ts-expect-error injected above, so it is not in the page's types
    return await window.axe.run(document, { resultTypes: ["violations"] });
  });

  const violations = results.violations as {
    id: string;
    impact: string | null;
    help: string;
    nodes: { target: string[] }[];
  }[];

  if (violations.length === 0) {
    console.log("  axe: no violations");
  } else {
    violationCount += violations.length;
    for (const v of violations) {
      console.log(`  axe [${v.impact ?? "n/a"}] ${v.id}: ${v.help}`);
      for (const node of v.nodes.slice(0, 3)) {
        console.log(`       ${node.target.join(" ")}`);
      }
    }
  }

  await page.close();
}

await browser.close();
server.close();

console.log(
  violationCount === 0
    ? "\nNo violations. Now watch the filmstrips — this check can tell you the page is unbroken, never that it is any good.\n"
    : `\n${violationCount} accessibility violation(s) above. Advisory, but read them.\n`,
);


/**
 * Tile frames into one image, by building a page of them and screenshotting
 * that. Composing in the browser we already have avoids adding an image
 * library for something this small.
 */
async function composeFilmstrip(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  frames: string[],
  labels: string[],
  path: string,
): Promise<void> {
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  const cells = frames
    .map(
      (data, i) => `
        <figure>
          <figcaption>${labels[i]}</figcaption>
          <img src="data:image/png;base64,${data}" />
        </figure>`,
    )
    .join("");

  await page.setContent(`
    <style>
      body { margin:0; background:#11141c; font:12px ui-monospace, monospace; }
      .strip { display:grid; gap:10px; padding:12px; }
      figure { margin:0; }
      figcaption { color:#8b93a8; padding:2px 0; }
      img { display:block; width:100%; border:1px solid #2a3145; }
    </style>
    <div class="strip">${cells}</div>
  `);
  await page.screenshot({ path, fullPage: true });
  await page.close();
}
