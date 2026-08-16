# COMP4020 prototype

This is your starter repo for a COMP4020 prototype: a static site written in
HTML/CSS/TypeScript that builds to plain HTML/CSS/JS and deploys to GitHub
Pages. The **deployed site is what gets marked** --- not this repo, and not "it
works on my machine". It's marked live in Chrome against the deployed URL at two
viewports --- 1920×1080 (desktop) and 390×844 (phone) --- and both count in
full, so make that artefact good at both and use the checks below to know
whether it is.

What you're building this week — the spec — is published on the course website,
and this repo's name tells you which deliverable it is. Run the course plugin's
**start** skill at the start of each week: it pulls the right spec from the
course API, carries your harness forward from last week, and helps you turn the
spec's checkable lines into tests of your own. Read the spec before you build,
and see `spec/README.md` for how the checks in this repo relate to it.

## How to work in here

- Keep the dev server running (`pnpm dev`) so you see changes as you make them.
- Before you push, run `pnpm check`. It runs most of what CI runs --- build,
  lint, and the spec --- so you catch those in seconds instead of waiting for
  the pipeline. The links check, the evidence check, the secrets scan, and the
  deploy itself only run in CI; run `pnpm dlx linkinator ./dist --silent`
  locally against a fresh `pnpm build` for the links check without waiting for
  CI.
- To see what the page actually looks like rather than what you assume it looks
  like, open it in a browser (the `agent-browser` CLI, documented on
  [the course site](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/backpressure/#agent-browser-the-rendered-page-as-ground-truth),
  works well for this). The rendered page is the truth; your mental model of it
  isn't.
- When a check fails, read its output before changing anything. Each check below
  names what it measures, and the failure message is the instruction: it tells
  you the file, the line, or the contract. Treat a red check as authoritative
  --- the page is wrong until the check is green, not until you decide it should
  be.
- Commit when the checks pass. Never commit a red state.

## The checks (your sensors)

CI runs these on every push once your repo is public. GitHub's checks UI shows
two jobs, `check` and `deploy` --- not one status per sensor below --- and
within `check` the steps run in sequence (`pnpm check` chains typecheck, build,
lint, and the spec with `&&`), so an early failure like a broken build stops the
later sensors from running for that push; fix it and push again to see the rest.
While the repo is private (all week, until you ship) the CI jobs stay skipped
--- `pnpm check` is the same roster on your machine, and it's the faster loop
anyway. They aren't hoops. Each is a different way of finding out something true
about the site that you can't reliably see by looking at it.

They also carry a mark at a crit: the sweep runs fifteen minutes after your
cutoff, and green checks there are worth half that week's shipped mark. Still
running counts as not green, so ship with time for CI to finish.

- **typecheck** --- `tsc --noEmit` runs first in `pnpm check`, so a type error
  stops the roster before the build even starts. The types are extra
  backpressure: a red here is the compiler telling you a claim in the code is
  false.
- **build** --- the site must build (`pnpm build`). A build failure means the
  deployed site is broken or stale, so nothing else matters until this is green.
- **deploy / online** --- the live GitHub Pages URL must load and return the
  page you expect. An asset that 404s on the deployed URL counts as broken even
  if it loads locally.
- **spec** --- `spec/invariants.test.ts` asserts what's true of any good
  website, whatever the week's brief asks; the tests you write for the week's
  own spec run alongside it (any `spec/*.test.ts`). A failure names the contract
  you haven't met yet.
- **lint** --- `stylelint` for CSS, `oxlint` for TypeScript. Flags code that's
  wrong, fragile, or non-idiomatic. Read the rule it names.
- **tests** --- any other tests you write, wherever you put them (co-located
  with your source is fine, not just `spec/`), must pass. Vitest picks up both
  this and the spec suite in one `vitest run`, the last step of `pnpm check`. A
  failing test is a claim about the site that's no longer true.
- **evidence** (`pnpm check:evidence`) --- checks your process evidence:
  `PROCESS.md`'s citations resolve to real commits, the current deliverable's
  exact reflection is in `reflections/` (worked out from this repo's name
  against the public course API), and your `CLAUDE.md` is present. Evidence
  gates the deploy --- `deploy` needs `check` to pass, so failing evidence
  blocks the deploy alongside everything else. See
  [Your process is part of the mark](#your-process-is-part-of-the-mark) below,
  and the course website's
  [assessment page](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/#what-you-submit)
  for what counts as evidence.
- **links** --- internal links must resolve. A broken link is a dead end you
  didn't mean to ship.
- **secrets** --- the repo is scanned for committed credentials. Never put a
  key, token, or password in a tracked file. If one leaks, rotate it. A local
  pre-commit hook (`.githooks/pre-commit`, installed by `pnpm install`) also
  blocks any commit containing something shaped like an API key --- by the time
  CI sees a key it's already pushed, so the hook is the sensor that matters.

Nothing here measures **accessibility** or **performance** --- wiring those
sensors (`axe-core`, Lighthouse, or whatever you choose) is your work, and later
in the course the spec will ask you to show how you tested both. When you do,
read a green performance result honestly: it's a lab estimate from one run on a
CI machine, not proof the site is fast for real users.

## The stack is swappable

Out of the box this is plain HTML/CSS/TypeScript on Vite, and every `.html` file
in the repo is a page: add pages, link them, and the build picks them up with no
config. That's a default, not a rule (unless the week's spec says otherwise).
You can swap in Astro or any other static generator, because nothing in CI names
a tool --- the whole contract is:

- `pnpm build` emits the complete site into `dist/`
- the `package.json` scripts (`check`, `check:evidence`, `build`) keep working
- whatever lands in `dist/` still passes the invariants in `spec/`

Two things bite in a swap. The deployed site lives under a path
(`…github.io/<repo>/`), so configure your generator's base path --- this
template's Vite config uses relative asset URLs to sidestep that, but most
generators (Astro included) need `base` set explicitly, and getting it wrong
looks fine locally while every asset 404s on the live URL. And commit the
updated `pnpm-lock.yaml`: CI installs with `--frozen-lockfile`.

## Your process is part of the mark

The deployed page is only half of it. How you got there is marked too: your
commit history, your agent files, and the decisions visible across them. The
checks above can't see any of that, so a person reads it directly --- which
means building legibly is part of building well.

- **Commit as you go.** Small, frequent commits are the record of how the work
  came together, and that record is read, not just the final state. A trail that
  grew alongside the code is the strongest evidence of your process; a single
  dump the night before is the weakest.
- **Keep a process overview** (`PROCESS.md`). A short reading-guide, not an
  essay: what you built, the moments that mattered --- each pointing at a
  commit, a `CLAUDE.md` change, or a prompt and the commit it produced --- and
  where to look in the history. It points a marker at the evidence; it doesn't
  stand in for it, and claims the history doesn't back don't count. The
  `PROCESS.md` in this repo is a template showing the shape and the citation
  format (link text the commit hash or range, target the commit or compare URL);
  `pnpm check:evidence` verifies your citations resolve to real commits before
  you ship. Markers follow those citations and don't trawl the repo for evidence
  you didn't cite.
- **Write your reflection in `reflections/`** --- a short markdown file in this
  repo, named for the deliverable it answers, so the number in the filename is
  the number in this repo's name (`crit-1.md` in `comp4020-crit1-<you>`,
  `assignment-1.md` in `comp4020-ass1-<you>`); `reflections/README.md` has the
  full rule. `pnpm check:evidence` checks the exact current name against the
  course API, not merely the presence of any well-named file. It answers the two
  standing prompts: the breakthrough that moved the work forward, and what this
  work changed about the developer you want to be. It stays out of the deployed
  site. It's due at the cutoff, and if it isn't in the repo by then the week
  doesn't count as shipped, however good the prototype is.
- **This file is process evidence.** The harness you build to direct the agent,
  this `CLAUDE.md` and any `AGENTS.md`, is itself read as part of how you
  worked. Keep it honest and current (see below).

You don't need a name, a student number, or any identity file in the repo: we
know whose repo it is. Spend the effort on the work.

## This file is yours

This CLAUDE.md is a starting point, not a fixed rulebook. As you learn what your
prototype needs --- a convention to hold the agent to, a sensor that keeps
catching you out, a fact about the stack the agent keeps getting wrong --- write
it down here. Growing this file is the work of harness engineering, and the gap
between this boilerplate and your own version is part of what your prototype
says about the developer you're becoming.

---

# This build: gravitational redshift explainer

Everything below this line is mine, not the template's. It was written before
any of the page existed, so it governs the build rather than describing it
afterwards.

## Sensors

A sensor earns a place in the gated `pnpm check` roster only if it is
**specific** (its failure names what broke), **fast**, **automatic**, and
**trustworthy** (it fails only when something is genuinely wrong). Anything
that doesn't clear all four stays *advisory* --- run by hand, read with
judgement --- until it proves itself.

| Sensor | Gated? | What it tells me |
| --- | --- | --- |
| `spec/invariants.test.ts` | gated | The template's always-on contract: lang, title, viewport, nav landmark, one `h1`, alt text. Unchanged. |
| `spec/redshift.test.ts` | gated | The physics is right: `z = 0` at zero compactness, `λ_obs` strictly increasing in compactness, the divergence handled at the top of the slider's range. |
| `spec/spectrum.test.ts` | gated | Wavelength→colour is right *and* defined past the visible band, which is exactly where this page's interaction ends up. |
| `spec/core-interaction.test.ts` | gated | The graded core interaction, asserted against built `dist/`: the slider exists, is labelled, and driving it to a higher value yields a longer `data-observed-nm` and a further-right spectrum marker. |
| `pnpm check:visual` | **advisory** | Playwright screenshots at both marking viewports (1920×1080, 390×844) plus an axe-core scan. Mechanical catch for layout and contrast breaks. Not in `pnpm check`, not in CI. |

Two rules about growing this table:

- **New elements bring their own sensor, in the same pass.** When a new piece
  of behaviour lands, its test lands with it --- so a later change cannot
  silently break something an earlier layer established.
- **A DOM sensor is written when the DOM it asserts exists**, not before.
  `core-interaction.test.ts` runs against `dist/`, so writing it during the
  harness pass would hold `pnpm check` red across the whole build and force a
  choice between "never commit red" and having any commit trail at all. It gets
  written at the start of the interactivity layer. Pure-logic sensors have no
  such constraint and are written first, before the code they test.

`pnpm check:visual` is deliberately advisory. It tells me whether the layout
*broke*; it cannot tell me whether the design is *good*. Those are different
questions and only one of them is a machine's.

## Backpressure: layers, and looking on purpose

Build **horizontally across the whole page**, least complex to most complex ---
math → theme → layout → static content → interactivity --- not one section
finished at a time. Building vertically means re-deciding the palette and the
spacing scale once per section; building horizontally decides each of those
once, and gets the graded interaction's maths proven before anything visual
depends on it.

Within the interactivity layer, **the core slider is wired first**. It is the
highest-risk, most-graded piece; it gets the most remaining clock.

**Looking is rationed on purpose.** Screenshots are expensive context, and a
description of a screenshot is strictly worse evidence than the user looking at
the page. So: no screenshot-per-change. At the end of each layer that has
produced something visible, stop, run `pnpm check:visual`, and hand over *one
batched round* --- the dev server URL, or a single set of screenshots covering
the whole page as it stands --- before the next layer starts. Extra screenshots
are reserved for a genuine ambiguity that code cannot resolve.

Layers 0 and 1 produce no page to look at (pure functions; CSS tokens with no
markup consuming them), so they report as text. That leaves three checkpoints
that are actually worth an interruption: **skeleton at both viewports**, **real
content**, **wired interaction**.

Keyboard operability is checked at every checkpoint, not once at the end: tab
to the slider, drive it with arrow keys, confirm the readouts move.

## Design preferences

**Parameterise by compactness, honestly.** The slider is
`x = 2GM/(Rc²)` --- dimensionless, radius held conceptually fixed, so one
slider means one physical thing ("how much gravity") rather than a decorative
colour-cycler with physics-flavoured labels. `z = 1/√(1−x) − 1`;
`λ_obs = λ_emit × (1 + z)` with `λ_emit` fixed at 500nm.

Two consequences to design *for*, not around:

- `z` diverges as `x → 1`. At the slider's top (`x = 0.95`), `λ_obs ≈ 2236nm`
  --- far outside the visible band. That is the honest answer and a good
  lesson: the light leaves visible light entirely. So `wavelengthToColor` must
  be defined past ~750nm (fading to deep red, then to a dim near-black), and
  the spectrum marker clamps to the right edge with an explicit "beyond
  visible" state rather than sliding off into nothing.
- A linear slider in `x` bunches most of the visible change into the top of its
  travel. Accept this as the lesson rather than linearising it away --- the
  non-linearity *is* the physics.

**Contract between the DOM and its test.** These attribute names are fixed here
so the wiring and the sensor cannot drift apart:

- `data-observed-nm` --- observed wavelength in nm, on the readout element
- `data-redshift-z` --- the redshift factor `z`
- `data-spectrum-pos` --- marker position, 0–1 along the spectrum bar

**Palette.** Deep navy/near-black for the space-side sections, warm off-white
for the reading sections, charcoal text, one restrained warm accent. Spectrum
colours are reserved for the spectrum bar and the star's glow --- they are the
page's data, so nothing decorative is allowed to borrow them.

**Motion.** Any ambient drift respects `prefers-reduced-motion`.

**Scope discipline.** One idea, one mechanic. The slider experiment is *the*
core interaction. A two-observers section and a physics-formula toggle are
labelled stretch and are cut without guilt if the clock runs out --- one idea
carried all the way beats more sections, thinner.
