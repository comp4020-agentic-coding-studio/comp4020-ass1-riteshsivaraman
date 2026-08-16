# Process overview

Citations link to `comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman`.

## What I built

I built an interactive simulation-based explainer for gravitational redshift. Escaping light gets stretched by gravity up until a certain point, at which it is no longer on the visible spectrum. This idea manifested into three simulations. A gravity slider, two observers in a common well, and the same formula applied against Earth, the Sun, Sirius B, and a neutron star.

The physics is separated and stored in a DOM-free module, while the page is a thin wiring layer over this.

The key takeaway of this assignment is the shift from simply asking for fixes to understanding how and why the harness didn't catch defects it was supposed to.

## The moments that mattered

### 1. Harness before page

Before starting any implementation, I made sure sensors, layering and design rules went into `CLAUDE.md` before any markup. This made sure the build was governed by these rules, rather than trying to fit a finished product to follow rules after its made.
([6073ba3](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/6073ba3)).

A key rule governed *when* a sensor is written: pure-logic sensors before the
code they test, DOM sensors at the start of the layer that creates their DOM. A
`dist/` test written early would have held `pnpm check` red all build
([362dc10](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/362dc10)).

### 2. Refusing a one-off fix

On the first pass, the page passed every check, but it was lifeless. Four green checkpoints had reported nothing in this regard.

My initial instinct was to list what looked wrong and simply have it fixed. Instead I decided to engage with the agent about this issue in a different manner. I asked why it had been delivered this way, and how the workflow could be changed, before implementing changes in the page. One of the answers I got was that **every sensor I owned measured a still
frame**, such as frozen screenshot instants and static DOM. The
harness had implicitly become the spec, so the interactive and dynamic qualities measured essentially decayed to zero.
([9698457](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/9698457)).
The fix here was using a sensor that could analyse movement across multiple frames
([77ca492](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/77ca492)).
This immediately turned vague complaints into concrete ones. For example, one filmstrip showed five frames in which the result moved from z=3.39 to 0.00, while the only visible change on the page was a 3px hairline sliding right.

### 3. Making the protocol repeatable

Initially, bugs were patched ad hoc, as one-off fixes. However, in this assignment I asked the agent to create a system for addressing them. This led to the creation of the
defect loop: gather evidence before diagnosing, naming the type of bug instead of the specific instance, hypothesising
why no sensor caught it, **add the sensor which should fire red**, and only then, fix the issue. The agent helped build a template, DEFECTS.md around this process.
([9d3b1f5](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/9d3b1f5)).
When trying to use this template, I realised there was no specified channel to raise the defects. This is when we decided the defects could be described in the prompts, and then matched against the template.
([dccdeb0](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/dccdeb0)).

Written red before any fix, these sensors found what reading the code never
would: a mark rendering at **0.0 × 143.3px** with every attribute on it correct,
and **16 labels under 11px** on phone
([edf3efa](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/edf3efa) → [854739d](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/854739d)).
Better than detecting a bug is making it impossible, so simulation 3 was rebuilt
with no SVG at all ([ae8972d](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/ae8972d)).

### 4. A rule can be the defect

Reporting five defects through that template
([daa8b8a](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/daa8b8a))
surfaced the sharpest lesson. Simulations auto-playing wasn't a slip: the harness
*said* a simulation should "demonstrate itself at rest", and that was implemented
faithfully. The rule had to change with the code, or it would simply grow back.

There was a clear division of labour between me and the agent, with very little overlap. The
harness found things I could perceive: contrast ratios, a 3.5×10⁻⁷ nm rounding
error, and a mark rendering at 0px. I, however, noticed things no sensor had been pointed at: a
page that felt dead, and a simulation that taught nothing. Most of the issues me and the agent found were exclusive.
