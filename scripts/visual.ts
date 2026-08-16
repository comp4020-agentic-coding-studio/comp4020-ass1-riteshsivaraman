// `pnpm check:visual` — the advisory sensor.
//
// Screenshots the built site at both viewports it will be marked at, and runs
// an axe-core accessibility scan over each. Advisory on purpose: it tells me
// whether the layout broke, not whether the design is good. Those are
// different questions and only one of them is a machine's. It is not in
// `pnpm check` and not in CI — it needs a browser binary, and a sensor that
// can fail for reasons unrelated to the site is not one to gate on.

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

const TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

// Serve dist/ rather than opening file:// — module scripts and fetches
// behave differently under file://, so this measures what actually ships.
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

mkdirSync(OUT, { recursive: true });
const axe = readFileSync(resolve("node_modules/axe-core/axe.min.js"), "utf8");

const browser = await chromium.launch();
let violationCount = 0;

for (const viewport of VIEWPORTS) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
  });
  await page.goto(`http://localhost:${port}/`, { waitUntil: "networkidle" });

  await page.screenshot({
    path: join(OUT, `index-${viewport.name}.png`),
    fullPage: true,
  });

  // The page at rest is the one state a full-page screenshot always catches
  // and the least interesting one — the slider sits at zero, so both waves
  // match and nothing has shifted. Drive it and photograph the state the
  // reader is actually here for.
  await page.evaluate(() => {
    const slider = document.querySelector("#compactness") as HTMLInputElement;
    slider.value = "0.82";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
  });
  // The spectrum marker eases to its new position. Without this wait the
  // screenshot catches it mid-transition and reports a marker position that
  // the page never actually settles on — the first driven screenshot showed
  // 82% for a value that pins to 100%.
  await page.waitForTimeout(400);
  await page.locator("#experiment").screenshot({
    path: join(OUT, `experiment-driven-${viewport.name}.png`),
  });

  await page.addScriptTag({ content: axe });
  const results = await page.evaluate(async () => {
    // @ts-expect-error injected above, so it is not in the page's types
    return await window.axe.run(document, {
      resultTypes: ["violations"],
    });
  });

  const violations = results.violations as {
    id: string;
    impact: string | null;
    help: string;
    nodes: { target: string[] }[];
  }[];

  console.log(`\n${viewport.name} (${viewport.width}x${viewport.height})`);
  console.log(`  screenshot → screenshots/index-${viewport.name}.png`);
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
    ? "\nNo accessibility violations. Now go and look at the screenshots — this check cannot tell you whether the page is any good.\n"
    : `\n${violationCount} accessibility violation(s) above. Advisory, but read them.\n`,
);
