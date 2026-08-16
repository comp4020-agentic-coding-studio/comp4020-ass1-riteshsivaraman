# Assignment 1 — reflection

## What was the breakthrough that moved the work forward?

Realising that a bug report is two bugs, and that I had been reporting one.

Partway through I had a page that passed every check and was completely
lifeless. My instinct was to list what looked wrong and ask for it to be fixed.
What actually moved the work was refusing to do that — asking instead why it had
been *delivered* that way, before anything was touched.

Every sensor I owned measured a still frame. Screenshots are frozen instants,
the accessibility scan reads a static DOM, the DOM tests assert values after the
event has settled. Nothing could perceive motion, so the harness had quietly
become the specification and the one quality nothing measured decayed to zero
without a single check going red.

That reframed every report after it. The defect is the cheap half; the expensive
half is why the harness let it through. Adding the sensor *before* the fix and
watching it go red is what separates a system from a habit — one written
afterwards only confirms what you already decided.

The sharpest version came last. Simulations auto-playing wasn't a slip: my own
harness said a simulation should "demonstrate itself at rest", and that had been
followed exactly. A rule can be the defect, and deleting the code without
correcting the rule only lets it grow back.

## What did this work change about who I want to be as a software developer?

I want to be someone who spends the harness budget before the code budget, and
who treats every complaint as evidence about the harness rather than about the
code.

The instinct under a deadline is to build first and add checks if time remains.
Doing it the other way made the night calmer rather than slower: every commit
was green.

What I want to carry is narrower — knowing which questions belong to a machine
and which belong to me. A test can tell me the redshift maths is
right, the contrast passes, and no label renders under eleven pixels. It cannot
tell me whether the page feels alive, or whether "you simply cannot see it any
more" is the right sentence to put under the readout. Every defect I found was
in that second category; every defect the harness found was in the first.
Neither of us found the other's, once. Building the machine's half properly is
how I get to spend attention on mine.
