# Rehearsal: home page illustrations

Built with the Stageshow skill (`src/kit/`), checked with its `film.mjs` gate.

## Replay hero (`ReplayDemo.tsx`)

Gold: `fade-crop` for the framing (window inset top and sides, a mask dissolving its
foot over filler), `dark-hero` for depth on black (surface steps and a hairline, no
glow). Kept: the mask on a wrapper so the window keeps its edge, filler only under the
fade. Changed: the content is HE Tuner's own Visualizer card (depth trace, actuation
line, registered strip, the two sliders), in the site's tokens (`look.css`).

Beats: open on the stock 1.5 mm / RT 0.40 mm, the replay counter ticks and the line
rises to 0.6 mm (dots slide up the curve, strips start sooner), resting fingers are
named, RT tightens to 0.15 mm, payoff "Registers 15 ms sooner". Plays once in view,
about 5 s; the poster is the payoff. The strips and the gain come from
`analysis/core.ts`'s `simulate`, not drawn by hand.

Widths: from 860 the browser window, two sliders side by side, fading at its foot
over the Visualizer's stat tiles. Below 860 the browser chrome goes (a narrower window
would read taller than wide): the card alone, one gutter round it, sliders stacked full
width, running off the right. Its height (436) is measured, the same in every language.

## Feature grid (`FeatureGrid.tsx`)

Gold: `ruled-bento`. Kept: one container, 1px rules, 2 + 1 / 1 + 2 / band, copy as page
text, one Stage per picture measured from its cell, one beat each, 110 ms apart.
Changed: five HE Tuner tiles (six tests, 8,000 Hz, per-key depth, strafe overlap and
SOCD mode, local and open source). Two of five tiles are UI, none is a window.

Wide, the six tests are one panel ruled into a 3 × 2 grid; narrow, the same panel as
a list. Key names in the copy (WASD, ZQSD, A and D…) come from the visitor's own
layout, like the keycaps under them.

## Film

- `--gate` passes on the hero poster at 390, 768, 900, 1024, 1440 and on its motion
  at 390 and 1440; on the grid's states at 390, 768, 1440.
- Fixed from the film: a held key releasing under RT 0.15 (the synthetic wobble was too
  large), the annotation over the curve, slider and dot jumps (per-frame updates and a
  0.25 ms trace), the browser window at 390, the test cards' gutters at 390.
- Standing: `steps in its box` on keys and labels during the page's own entrance
  transition (the host's blur-in, not the scene); `jump` lines only inside headless
  sampling gaps.

## Review (fresh eye, from frames)

1. Hero window body was the page's own black: now a step lighter (page, window, card).
2. 768 showed the narrow design stretched: sliders now span the card, filler tiles and
   the bare foot are gone from the narrow design.
3. 390 had a dead foot under the card: the stage now ends one gutter under it.
4. Tests read as six boxed cards: one ruled panel.
5. English copy said WASD over an AZERTY board: copy follows the layout now.
6. Hero payoff small (a 15 ms shift is ~6 px at this time scale): knob halos quieted so
   the line, dots, strips and chip hold the lime. Not changed further: a zoomed time
   axis would lose the rest/hold/tap context.
7. "Read at" floated mid-cell: on the title line, the figure at the foot.
8. Statement band outsized at 390: page-copy size there.
9. SOCD mode changed nothing: Snappy Tappy now cuts the first key where the second goes
   down, and the overlap is left as an outline.
10–12. Product icons and mono labels are the site's own; left as they are.

Not checked: Safari and Firefox; a real 120 Hz display; touch.
