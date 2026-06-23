# Taste Guide

Blocksmith taste is explicit, inspectable policy. It is not prompt magic.

## What gets scored

- Hierarchy: clear primary and secondary focus.
- Rhythm: section order has variation and pacing.
- Proportion: type, spacing, and content widths are restrained.
- Contrast: text and controls are readable.
- Restraint: avoids random accents and decoration.
- Coherence: tokens, section variants, and site type agree.
- Responsiveness: mobile keeps the design intent.

## Hard failures

- Repeated same section structure three times in a row.
- Unreadable color contrast.
- Empty hero or query-critical areas.
- Broken mobile layout once screenshot review is attached.
- One-off colors outside tokens.
- Excessive font count.

## Warnings

- Weak CTA hierarchy.
- Bland section rhythm.
- Awkward line lengths.
- Too many visual accents.
- Underpowered header or footer.
- Mismatch between taste profile and section variants.

## Repair style

Taste findings should give concrete fixes:

- Add a hero near the top.
- Replace repeated grids with a media/text section.
- Tighten line length using `layout.contentSize`.
- Improve `base` and `contrast` token ratio.
- Use section variants preferred by the active profile.

## Premium polish loop

Premium polish is made from repeatable choices the compiler can inspect:

- Use a spacing ladder: related text gets tight gaps, components get medium gaps, section changes get large gaps, and major page turns get the largest gaps.
- Keep typography role-based: display, page title, card title, body, metadata, navigation, and labels should each have a deliberate size, weight, line-height, and measure.
- Align optical edges across header, hero, cards, archives, post pages, footer, and mobile.
- Use one dominant surface treatment plus one supporting treatment. Too many equal borders, shadows, fills, and accents make a theme feel cheaper.
- Make repeated cards stable: consistent media height, equal-height bodies, predictable gutters, and metadata anchored low.
- Score the whole route family, not just the front page: archive, category, tag, author, date, search, single, page, 404, header, footer, and mobile.

## Imagegen-directed taste loop

Blocksmith can use generated bitmap comps as visual direction, not as vague decoration. A single nice masthead image is not enough; the useful artifact is a whole-page reference that shows hierarchy, rhythm, density, and footer/header strength.

Recommended flow:

1. Write the blueprint and choose a taste profile.
2. Generate a full-page layout/style comp with Imagegen for the intended site type.
3. Save the selected comp under `docs/assets` as a visual reference.
4. Extract deterministic rules from the comp: section order, headline scale, card density, accent placement, image treatment, footer weight, and mobile collapse behavior.
5. Generate or supply individual frontend assets only after the whole-page direction is clear.
6. Run `blocksmith preview` and capture a screenshot.
7. Compare the screenshot against the comp and revise compiler rules, section variants, tokens, and blueprint content.

The comp should describe the theme's editorial world while keeping final text, navigation, and content as real HTML. Avoid fake browser chrome, brand marks, watermarks, excessive decoration, and tiny unreadable UI text.
