# Reporting a defect

The loop this feeds is in `CLAUDE.md` under **The defect loop**. This file is
the front door to it: how to report something, what happens next, and what has
already been through it.

## Where to report

**Paste it into the chat.** That is the channel — there is no tracker to file
into and no form to submit. One line is enough (see the quick form below), and
several at once is fine and usually better, because a batch gets triaged
together rather than one interruption at a time.

Two other places, for when chat isn't where you are:

- **The Open list at the bottom of this file.** Add a row and commit it. Use
  this when you're reading the page away from a session, or want the report to
  survive one. Anything sitting there gets picked up at the start of the next
  session.
- **Nothing else.** Don't open GitHub issues for this — the repo has no issue
  workflow, and a report nobody is watching is worse than one that was never
  written.

Reports move from **Open** to **Log** once they've been through all six steps,
so the two tables together are the state of the system: what's outstanding, and
what's been dealt with and how.

## Report symptoms, not diagnoses

The division of labour that has held for this whole build:

- **The harness finds what a person cannot perceive** — contrast ratios, a
  3.5×10⁻⁷ nm rounding error, a mark rendering at 0px, text at 5.8px.
- **The person finds what no sensor was pointed at** — that the page felt dead,
  that a simulation was too simple, that a colour change wasn't obvious.

Neither has ever found the other's bugs. So the valuable half of a report is
the half only you can supply: **what you saw and what you expected**. Guessing
the cause is welcome and costs nothing if it's wrong — every reported cause
gets verified by measurement before anything is changed — but it is never the
part that matters.

## The quick form

Most reports need one line. This is enough:

```text
[where] [viewport] what you saw — what you expected instead
```

> `sim 3, phone — labels overlap and I can't read them, expected them legible`

## The full form

Use this when it's tangled, intermittent, or you want to be sure nothing is
lost.

```markdown
### What I saw
One or two sentences. Plain description, no theory needed.

### Where
Section (hero / prediction / sim 1 / explanation / sim 2 / sim 3 / closing),
or a URL anchor.

### Viewport
desktop (1920×1080) / phone (390×844) / both / not sure

### Kind
broken / illegible / unclear / feel        ← see the table below

### To reproduce
Only if it isn't there the moment the page loads. Otherwise "on load".

### What I expected instead
The half a sensor can never supply. Worth a sentence even when it feels obvious.

### My guess at the cause (optional)
Fine to leave blank, fine to be wrong.
```

### Kinds, and which sensor should have caught it

The kind matters because it predicts whether a sensor could ever have seen it,
which is the first question the loop asks.

| Kind | Means | Sensor family that owns it |
| --- | --- | --- |
| **broken** | Doesn't work, or renders wrong | unit tests, jsdom tests, rendered-geometry |
| **illegible** | Works, can't read or see it | legible-text floor, axe contrast |
| **unclear** | Works and is readable, but doesn't teach | **none — human only** |
| **feel** | Correct and clear, but dull, janky or annoying | filmstrips; otherwise human |

Two of these have no machine owner. That is not a gap to be closed with a
cleverer sensor — it is the reason the "how does it feel?" checkpoint question
exists alongside "is it broken?".

## What happens next

1. **Measured, not guessed.** A number comes out of the running page — a
   bounding box, a computed size, a filmstrip frame — before any diagnosis.
2. **Named as a class**, not an instance. Not "the observed line is invisible"
   but "an element can be attribute-correct and render nothing".
3. **Explained**: why no sensor caught it. No sensor exists / coverage was
   partial / a sensor measured the wrong thing.
4. **Sensor added first, and watched go red** on the known defect. A sensor
   written after the fix only confirms what was already decided.
5. **Fixed**, and the sensor goes green.
6. **Designed out where possible.** Detection is the fallback when a class
   can't be made unreachable.

Expect steps 1–3 back as a written finding before anything is edited. If a
report turns out to be something other than what it looked like, that gets said
plainly rather than quietly worked around.

## Worked example

> **What I saw:** sim 3's spectral line isn't there.
> **Where:** sim 3. **Viewport:** both. **Kind:** broken.

1. **Measured.** `getBoundingClientRect` → `0.0 × 143.3`.
2. **Class.** An element can be attribute-correct and render nothing.
3. **Why missed.** A sensor measured the wrong thing: every jsdom test asserted
   *attributes*, and all of them were correct. Nothing asked whether the
   element occupied pixels.
4. **Sensor first.** Rendered-geometry check over `[data-mark]`; went red at
   both viewports.
5. **Fixed.** A vertical `<line>` has a zero-width bounding box, and SVG filters
   default to `objectBoundingBox` units, so the bloom filter's region collapsed
   to nothing. Changed to a `<rect>`, which has area.
6. **Designed out.** Marks that carry meaning are rects, not zero-area lines.

## Open

Nothing outstanding. Add a row here to report something outside a session —
`what you saw` and `where` are the only fields that must be filled in.

| What I saw | Where | Viewport | Kind | Expected instead |
| --- | --- | --- | --- | --- |
| *(empty)* | | | | |

## Log

| Reported | Kind | Class | Sensor added | Fixed |
| --- | --- | --- | --- | --- |
| Page feels static and plain | feel | Every sensor measured a still frame | filmstrips (`77ca492`) | `9746865` |
| Sim 2's colour change isn't obvious | unclear | Meaning encoded on a hairline | *human-only; salience rule instead* | `9746865` |
| Sim 3 renders with overlaps | illegible | SVG text doesn't scale with the type system | legible-text floor (`edf3efa`) | `ae8972d` |
| Sim 3's line missing (found while looking) | broken | Attribute-correct, renders nothing | rendered-geometry (`edf3efa`) | `854739d` |
| Prose misaligned (found while looking) | broken | Two conflicting roles on one element | *none; measured directly* | `854739d` |
| Star clashes with text | feel | Text over the star had no scrim | *human-only; scrim rule* | `ec12383` |
| "Scroll" text unappealing | feel | — | *human-only* | `ec12383` |
| Wanted animate toggles | feel | Self-demo plays once, can't be re-run | animate-toggle tests (`ec12383`) | `ec12383` |
| Landing screen has no scroll indication | unclear | Affordance encoded on a hairline (1.0×48.0px) | affordance min-size (`data-affordance`) | `daa8b8a` |
| MCQ doesn't show right/wrong visually | unclear | State carried in prose only | prediction correctness tests | `daa8b8a` |
| Sliders animate on their own | feel | Motion nobody asked for; the *rule* caused it | "animates nothing on load" | `daa8b8a` |
| Sim 2 receiver has no animate box | feel | Hand-maintained coverage, again | toggle derived from every slider | `daa8b8a` |
| Sim 3 needs a grid to read scale against | feel | No reference frame for the change | gridline + tick tests | `daa8b8a` |
| Sim 3 gridlines don't change with the scale | broken | Grid positioned by layout, not by data | gridline-position test; `ticks.ts` unit tests | `f17ceca` |
| Animation restarts from the minimum | feel | Phase was the state, not position | `sweep.ts` unit tests | `f17ceca` |
| Gravity slider has no quantifier | unclear | The only slider with no value shown | slider-quantifier tests | `f17ceca` |
| Sim 3 observed label cut off at the end | broken | A label anchored to a moving mark can leave its clipping container | label-containment (`data-label`) | `HEAD` |
| Sim 2 emitter/receiver unlabelled | broken | Regression: names lost when labels moved out of the SVG | label-presence + tracking tests | `HEAD` |
