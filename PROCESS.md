# Process overview

Citations link to `comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman`.

## What I built

An interactive explainer for gravitational redshift: gravity stretches escaping
light, and past a certain strength it stretches it out of visible light
entirely. One idea reached three ways — a slider that turns gravity up, a pair
of observers at different depths in the same well, and the same formula run
against Earth, the Sun, Sirius B and a neutron star. All the physics lives in
DOM-free modules; the page is a thin wiring layer over them.

## The moments that mattered

### 1. The harness was written before a line of the page

Sensors, layering rule and design constraints went into `CLAUDE.md` first, so
they governed the build rather than being reverse-documented after it
([6073ba3](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/6073ba3)).

The rule I'm gladdest about concerns *when* a sensor is written. A DOM test
against built `dist/` would have been red for the whole build had I written it
during the harness pass, forcing a choice between "never commit red" and having
any commit trail — and the trail is half the mark. So: pure-logic sensors before
the code they test, DOM sensors at the start of the layer that creates their
DOM. `core-interaction.test.ts` was therefore written at
[362dc10](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/362dc10).

### 2. The stillness failure — the harness became the spec

The page passed every check and was completely lifeless. Four green checkpoints
had reported no problems. It took a human opening the live page to notice.

The root cause was not a design mistake; it was that **every sensor I owned
measured a still frame**. Screenshots are frozen instants, axe scans a static
DOM, the jsdom tests assert values *after* an event has settled. Nothing in the
roster could perceive motion, so the one quality nothing measured decayed to
zero, silently. Diagnosis and rules in
[9698457](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/9698457);
the fix was to give `check:visual` eyes for motion — filmstrips that sweep each
simulation and tile the frames
([77ca492](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/77ca492)).
It paid immediately, making a "the colour changes but you can't see it"
complaint concrete: five frames in which the result moved from z=3.39 to 0.00
and the only visible change was a hairline sliding right.

### 3. Turning bug reports into a system

Rather than fixing reported symptoms one by one, I wrote down the loop and
followed it: measure before diagnosing, name the *class* not the instance, say
why no sensor caught it, **add the sensor first and watch it go red**, then fix
([edf3efa](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/edf3efa)
→ [854739d](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/854739d)).

Two sensors, written red, found what no attribute test could: a mark rendering
at **0.0 × 143.3px** — an SVG filter on a zero-width bounding box, every
attribute on it correct — and **16 labels under 11px** on phone, the smallest at
5.8px. Then, where possible, I designed the class out instead of detecting it:
simulation 3 now contains no SVG at all, so illegible-at-390px is unreachable
([ae8972d](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/ae8972d)).

### 4. Coverage you maintain by hand is a defect waiting its turn

Simulation 3 went unfilmed for a whole pass because the filmstrip list was three
lines I had to remember to update — which is why nobody noticed its main mark
had never rendered. Coverage is now enumerated from the page itself
([edf3efa](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/edf3efa)).

**The division of labour, which held all build:** the harness found what I
cannot perceive — contrast ratios, a 3.5×10⁻⁷ nm rounding error, a 0px mark.
The human found what no sensor was pointed at — that the page felt dead. Neither
found the other's bugs.
