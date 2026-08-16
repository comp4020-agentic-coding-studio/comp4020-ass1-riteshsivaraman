# Process overview

## What I built

An interactive explainer for gravitational redshift: gravity stretches the
wavelength of escaping light, and past a certain strength it stretches it out
of visible light entirely. One idea, reached three ways — a slider that turns
gravity up on an abstract star, a pair of observers at different depths in the
same well, and the same formula run against Earth, the Sun, Sirius B and a
neutron star. All the physics lives in DOM-free modules; the page is a thin
wiring layer over them.

## The moments that mattered

### 1. The harness was written before a single line of the page

The sensors table, the layering rule and the design constraints went into
`CLAUDE.md` first, so they governed the build instead of being reverse-
documented after it
([6073ba3](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/6073ba3)).

The rule I'm most glad I wrote down is the one about *when* a sensor gets
written. A DOM test that runs against built `dist/` would have been red for the
entire build had I written it during the harness pass, forcing a choice between
"never commit red" and having any commit trail at all — and the trail is half
the mark. So: pure-logic sensors before the code they test, DOM sensors at the
start of the layer that creates their DOM. `core-interaction.test.ts` was
therefore written at
[362dc10](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/362dc10),
not six hours earlier.

### 2. Building the visual sensor early, and letting it overrule my eyes

The plan had `pnpm check:visual` as a checkpoint tool. It didn't exist — no
Playwright, no axe-core, nothing in `package.json`. I built it during the theme
layer rather than up front, because layers 0 and 1 produce nothing to look at
([c6b779e](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/c6b779e)).

It found three real defects across the build that I could not see: the accent
orange failing contrast on the light sections, white-on-orange failing on the
CTA
([071a171](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/071a171)),
and then a defect in *itself* — its driven screenshot caught the spectrum
marker mid-CSS-transition and reported a position the page never settles on
([08c9b7d](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/08c9b7d)).
It stays advisory and out of CI: it needs a browser binary, and it can tell me
the layout broke but never whether the design is good.

### 3. Rationing the looking, and rebuilding the schedule around it

I cut visual check-ins from per-change to one batched round per layer, then cut
again from five checkpoints to three after noticing that layers 0 and 1 produce
nothing visible — screenshotting them would have photographed the starter page.
Both cuts are in
[6073ba3](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/6073ba3).
The same insight reordered the build itself: horizontally across the whole page
(maths → theme → layout → content → wiring) instead of section by section, so
the palette got decided once rather than five times
([c6b779e...071a171](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/compare/c6b779e...071a171)).

### 4. A distinction I got wrong, then wrote into the harness

I had filed "a second draggable interaction" and "reveal the formula" together
as stretch. Asked whether there was really no room for more, I had to separate
them: **more mechanics dilute, more visualisation of the same mechanic
deepens.** That distinction is now a rule in `CLAUDE.md`
([071a171](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-riteshsivaraman/commit/071a171)),
and it's what kept three simulations coherent — abstract, relative, real —
rather than three unrelated toys.
