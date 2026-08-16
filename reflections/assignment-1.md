# Assignment 1 — reflection

## What was the breakthrough that moved the work forward?

Realising that *when I look* and *what order I build in* are the same decision.

I started out planning to check the page visually after every meaningful
change. Cutting that to one batched round per layer was meant to save context.
But once verification was batched per layer, building section-by-section stopped
making sense — you can't check a whole page at a checkpoint if only one section
of it exists. So the build order inverted: maths, then theme, then layout, then
content, then wiring, each pass touching the whole page.

That paid for itself in ways I didn't predict. Getting the physics right first
meant a wrong formula would have surfaced as a failing unit test, hours before
anything visual depended on it. Deciding the palette once meant I never
re-litigated it five times.

The other half was accepting that some things I genuinely cannot see. The
accessibility scan caught two contrast failures on a page I had looked directly
at and approved. I don't get to overrule a sensor on the strength of a glance.

## What did this work change about who I want to be as a software developer?

I want to be someone who spends the harness budget before the code budget.

The instinct under a deadline is to build first and add checks if there's time
left. Writing the sensor table and the build rules first made the night calmer
rather than slower — every commit was green, and I never had to wonder whether
a change had broken something three sections up.

The version I want to carry forward is harder: knowing which questions are a
machine's and which are mine. A test can tell me the redshift maths is right
and the contrast passes. It cannot tell me whether "you simply cannot see it
any more" is the right sentence to put under the readout. I want to stop
spending attention on the first kind so there's some left for the second.
