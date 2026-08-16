# Process overview

Citations link to `comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman`.

## What I built

An interactive explainer for gravitational redshift: gravity stretches escaping
light until, past a certain strength, it leaves visible light entirely. One idea
reached three ways — a gravity slider, two observers in the same well, and the
same formula against Earth, the Sun, Sirius B and a neutron star. The physics
lives in DOM-free modules; the page is a thin wiring layer over them.

The arc worth reading for is not the page. It is how I moved from asking for
fixes to asking why the harness let the defect through.

## The moments that mattered

### 1. Harness before page

Sensors, layering and design rules went into `CLAUDE.md` before any markup, so
they governed the build rather than describing it afterwards
([6073ba3](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/6073ba3)).

The rule that earned its place concerns *when* a sensor is written. A test
against built `dist/` would have held `pnpm check` red for the whole build,
forcing a choice between "never commit red" and having a commit trail at all.
So: pure-logic sensors before the code they test, DOM sensors at the start of
the layer that creates their DOM
([362dc10](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/362dc10)).

### 2. Refusing a one-off fix

The page passed every check and was lifeless. Four green checkpoints had
reported nothing.

My instinct was to list what looked wrong and have it fixed. Instead I stopped
and asked why it had been delivered this way, and for the workflow to change
before the page did. The answer: **every sensor I owned measured a still
frame** — screenshots are frozen instants, axe scans a static DOM, jsdom
asserts values after events settle. The
harness had become the spec, so the one quality nothing measured decayed to
zero, silently
([9698457](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/9698457)).
The fix was a sensor that can see motion
([77ca492](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/77ca492)),
which immediately made a vague complaint concrete: five frames in which a result
moved from z=3.39 to 0.00 while the only visible change was a hairline sliding
right.

### 3. Making the protocol repeatable

Having done it once by argument, I asked for it as a system. That produced the
defect loop — measure before diagnosing, name the class not the instance, say
why no sensor caught it, **add the sensor and watch it go red**, then fix — and
a report template built around it
([9d3b1f5](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/9d3b1f5)).
Trying to use it found the obvious hole: it specified a format and named no
channel
([dccdeb0](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/dccdeb0)).

Sensors-first then caught what argument never would: a mark rendering at
**0.0 × 143.3px** with every attribute correct, and **16 labels under 11px** on
phone
([edf3efa](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/edf3efa)
→ [854739d](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/854739d)).
Where possible the class was designed out rather than detected: simulation 3 now
contains no SVG at all, so illegible-at-390px is unreachable
([ae8972d](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/ae8972d)).

### 4. A rule can be the defect

Reporting five defects through the template
([daa8b8a](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/daa8b8a))
surfaced the sharpest lesson. Simulations auto-playing wasn't a slip — the
harness *said* a simulation should "demonstrate itself at rest", and that was
faithfully implemented. Deleting the code without correcting the rule would have
let it grow back, so the rule changed with it. Another was me breaking a rule I
had written: a scroll cue replaced by a 1px line, the exact hairline failure
`CLAUDE.md` forbids. The rule existed and nothing enforced it, so an affordance
size check now does.

**The division of labour, which held throughout:** the harness found what I
cannot perceive — contrast ratios, a 3.5×10⁻⁷ nm rounding error, a 0px mark. I
found what no sensor was pointed at. Neither found the other's bugs, once.
