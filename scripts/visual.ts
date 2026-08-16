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
import { chromium, type Page } from "playwright";

const DIST = resolve("dist");
const OUT = resolve("screenshots");

const VIEWPORTS = [
  { name: "desktop", width: 1920, height: 1080 },
  { name: "phone", width: 390, height: 844 },
] as const;

/** Each simulation, and how to sweep it. `t` runs 0 → 1 across the frames. */
const FILMSTRIPS = [
  {
    name: "sim1-gravity",
    section: "#experiment",
    drive: (t: number) => ({ "#compactness": String(0.95 * t) }),
  },
  {
    name: "sim2-observers",
    section: "#observers",
    // Sweep the emitter from deep to shallow while the receiver stays out:
    // redshift falls away to almost nothing.
    drive: (t: number) => ({ "#r-emit": String(1.05 + t * 10.95) }),
  },
] as const;

const FRAMES = 5;

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

  for (const strip of FILMSTRIPS) {
    const frames: string[] = [];
    const labels: string[] = [];

    for (let i = 0; i < FRAMES; i++) {
      const t = i / (FRAMES - 1);
      await setControls(page, strip.drive(t));
      // Let transitions settle, so a frame shows a state the page actually
      // rests on rather than one caught mid-ease.
      await page.waitForTimeout(450);
      const shot = await page.locator(strip.section).screenshot();
      frames.push(shot.toString("base64"));
      labels.push(`${Math.round(t * 100)}%`);
    }

    const path = join(OUT, `film-${strip.name}-${viewport.name}.png`);
    await composeFilmstrip(browser, frames, labels, path);
    console.log(`  filmstrip  → screenshots/film-${strip.name}-${viewport.name}.png`);
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

/** Set one or more range inputs and let the page react, as a real drag would. */
async function setControls(page: Page, values: Record<string, string>): Promise<void> {
  await page.evaluate((pairs) => {
    for (const [selector, value] of Object.entries(pairs)) {
      const input = document.querySelector(selector) as HTMLInputElement | null;
      if (!input) continue;
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, values);
}

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
