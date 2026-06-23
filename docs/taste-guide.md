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

## Imagegen-assisted taste loop

Blocksmith can use generated bitmap assets as taste material, not as vague decoration.

Recommended flow:

1. Write the blueprint and choose a taste profile.
2. Generate one art-directed hero or texture asset with Imagegen.
3. Save the selected asset under the blueprint folder.
4. Add it to `assets` with `role: hero`.
5. Run `blocksmith preview` and capture a screenshot.
6. Use the screenshot to revise composition, spacing, token contrast, or the image prompt.

The asset should reinforce the theme's editorial world while leaving readable space for real HTML text. Avoid image text, fake logos, brand marks, watermarks, and subject matter that would create licensing or trademark risk.
