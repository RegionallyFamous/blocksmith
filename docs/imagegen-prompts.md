# Imagegen Prompts

These prompts document project-bound generated assets. Keep originals in the user's generated-images folder and commit only optimized workspace copies.

## Regionally Famous full-page layout comp

Generated with the built-in Imagegen tool and saved as `docs/assets/regionally-famous-layout-comp.jpg`.

This is a design-direction artifact for the whole theme: masthead, hero, issue sidebar, feature cards, dispatch grid, editor note, newsletter band, and footer. It is not shipped as frontend content.

Prompt:

```text
Use case: ui-mockup
Asset type: full-page WordPress theme homepage design comp
Primary request: Design a complete desktop homepage mockup for a WordPress block theme called Regionally Famous Dispatch. This is a visual direction comp for layout, style, and taste, not a final screenshot. Use the whole page, not just a masthead.
Scene/backdrop: local editorial publication homepage for neighborhood stories, small cultural notes, venue profiles, guides, and regional dispatches.
Subject: a polished local magazine/blog theme with a strong editorial identity, warm but not beige-only, sophisticated and slightly handmade.
Style/medium: high-fidelity web design mockup, premium independent magazine aesthetic, WordPress block theme plausible, modern editorial grid, not SaaS, not landing-page marketing.
Composition/framing: tall desktop page screenshot, 1440px wide feel. Include: top nav masthead, large editorial hero with image and headline, a compact issue note/sidebar panel, three feature cards, latest dispatches list/grid, a pullquote or editor's note band, CTA/newsletter band, and footer. Use real hierarchy and varied section rhythm.
Lighting/mood: warm morning paper texture, crisp ink typography, confident but friendly.
Color palette: cream paper base, black ink, brick red accents, muted teal accents, warm tan panels, occasional white cards.
Typography: bold old-style serif display for headlines, clean humanist sans for body and labels. Strong type hierarchy, generous line-height, no cramped text.
Materials/textures: paper grain, subtle rules, card borders, editorial photography/map collage accents, light shadows.
Text: Use short readable labels where possible: "Regionally Famous", "Local stories with uncommon polish", "Latest dispatches", "Place notes", "People features", "Small legends". Keep text minimal and legible.
Constraints: must feel like a complete tasteful homepage layout, not an asset background. Avoid generic blog template, avoid bland beige monotone, avoid purple gradients, avoid stock-photo corporate look, avoid excessive decoration, avoid tiny unreadable UI text, avoid fake browser chrome, no brand logos, no watermark.
```

## Regionally Famous route-family comps

Generated with the built-in Imagegen tool and saved as:

- `docs/assets/route-comps/regionally-famous-home.png`
- `docs/assets/route-comps/regionally-famous-archive.png`
- `docs/assets/route-comps/regionally-famous-single.png`
- `docs/assets/route-comps/regionally-famous-page-404.png`
- `docs/assets/route-comps/regionally-famous-mobile.png`

These comps are design-direction artifacts for the complete theme route family. They are not shipped as page content. The compiler extracts structural decisions from them and rebuilds those decisions with normal WordPress block templates, Query Loop, template parts, post blocks, search blocks, and theme.json tokens.

Prompt pattern:

```text
Use case: ui-mockup
Asset type: full-page WordPress block theme route-family design comp
Primary request: Design the [home/archive/single/page/404/mobile] route for Regionally Famous Dispatch, a polished independent local publication theme. This is a visual direction comp for layout, style, rhythm, density, and taste, not a final screenshot.
Scene/backdrop: neighborhood editorial publication for local stories, cultural notes, people profiles, place guides, food, small legends, and civic life.
Style/medium: high-fidelity web design mockup, premium independent newspaper-magazine aesthetic, WordPress block theme plausible, real route-specific publishing UI.
Composition/framing: show the whole route with working editorial furniture. Preserve WordPress-native intent: inherited archive/search loops, single post article layout, page content, 404 recovery search, related/latest post paths, header and footer.
Typography: local Google Font pairing suitable for production: high-contrast editorial serif display and clean humanist sans body. Strong hierarchy, no cramped labels.
Color palette: cream paper base, black ink, brick red accents, muted teal footer/navigation, warm tan panels, restrained white cards.
Constraints: no fake browser chrome, no watermark, no external brand marks, no one-off random colors, no decorative UI that cannot become real WordPress blocks. Links, loops, search, empty states, and mobile composition must be designed as functional theme surfaces.
```

Extraction notes from the selected comps:

- Home: publication masthead, image-led hero, denser story cards, editor note, newsletter band, and a weighted footer.
- Archive/search: archive-specific search and topic recovery, compact metadata, stable card grid, and useful no-results path.
- Single: article meta rail, excerpt/deck, featured image discipline, readable article measure, related dispatches, and post navigation affordances.
- Page/404: utility routes still need designed hierarchy, search recovery, category/topic links, and latest-story onward paths.
- Mobile: smaller masthead, compact archive cards, retained article intent, and footer actions that do not swallow the viewport.

## Regionally Famous production image set

Generated with the built-in Imagegen tool, copied into `examples/assets/images/regionally-famous/`, optimized to JPG, and consumed by the compiled theme. These are not just references: the starter-content seed step imports story images into the WordPress media library and assigns them as featured images so Query Loop cards, single templates, archives, search results, and recovery routes show real WordPress media.

Saved assets:

- `hero-dance-hall.jpg`: homepage hero editorial photograph.
- `story-market-day.jpg`: featured image for "Market Day on 4th Street".
- `story-old-cinema.jpg`: featured image for "An Old Cinema Gets New Life".
- `story-teacher.jpg`: featured image for "A Teacher With the Long View".
- `story-brass-band.jpg`: featured image for "The Brass Band of Whitman Park".
- `story-food-guide.jpg`: featured image for "Where to Eat After the Late Show".
- `archive-map.jpg`: archive/search sidecar artwork.
- `not-found-lantern.jpg`: 404 recovery artwork.
- `header-bird.jpg`: masthead ornament used beside the wordmark.
- `editor-portrait.jpg`: editor-note and article-author portrait artwork.
- `town-sketch.jpg`: homepage collage, archive/story support art, and additional seeded story media.
- `newsletter-art.jpg`: illustrated newsletter-band background.

Prompt pattern:

```text
Use case: photorealistic-natural
Asset type: production WordPress theme editorial image
Primary request: Create a polished editorial image for Regionally Famous Dispatch, a local independent publication theme. This image will be used as [homepage hero/story featured image/archive support art/404 support art], not as a generic stock placeholder.
Scene/backdrop: [specific local scene or object tied to the route/story].
Subject: [clear subject with no readable text, logos, or fake UI].
Style/medium: premium independent magazine photography or tactile editorial illustration, warm ink-and-paper sensibility, real material texture, plausible for a WordPress block theme.
Composition/framing: strong crop for responsive web use, clear focal subject, room for headline/sidebar overlays where needed, no browser chrome.
Lighting/mood: warm natural light, confident local editorial tone, polished but not corporate.
Color palette: cream paper, black ink, brick red, muted teal, warm tan, restrained whites.
Constraints: no readable text, no brand marks, no watermark, no distorted hands/faces, no fake UI, no random colors outside the theme palette.
```

Production rule: if an Imagegen route comp shows photography, illustration, ornament, portraiture, or map texture as a structural part of the layout, generate or supply that asset separately and wire it into WordPress-native surfaces. Use `core/post-featured-image` for post media, imported Media Library attachments for seeded demos, and CSS backgrounds only for decorative route art that is not content. Route-comp fidelity requires both structural markup and asset parity: if the comp has a masthead ornament, editor portrait, illustrated newsletter band, or collage strip, those pieces must exist as real optimized assets in the theme.

## Regionally Famous masthead

Generated with the built-in Imagegen tool and saved as `examples/assets/regionally-famous-masthead.jpg`.

Prompt:

```text
Use case: ads-marketing
Asset type: WordPress theme hero/background editorial image
Primary request: Create a tasteful editorial masthead image for a local publication theme called Regionally Famous. No text, no logos.
Scene/backdrop: warm overhead composition on a cream paper table: a folded neighborhood map with abstract unlabeled streets, a small stack of local event cards with no readable text, a pencil, a coffee cup edge, a few clipped paper scraps, and subtle shadows.
Subject: regional/local publication mood, small places worth noticing, polished but handmade.
Style/medium: high-end editorial still life photograph with slight print-magazine warmth, realistic materials, not stock-photo generic.
Composition/framing: wide horizontal 16:9, strong empty space on the left/center for overlaid headline, objects clustered around edges and lower right, clean readable silhouette.
Lighting/mood: soft morning window light, warm but restrained, premium editorial calm.
Color palette: cream paper, warm tan, dark ink, muted brick red, muted teal accents.
Materials/textures: paper grain, matte print, pencil wood, ceramic cup, subtle dust and tactile detail.
Constraints: no readable text, no brand marks, no people, no screens, no logos, no watermark, no fake letters, no obvious AI artifacts.
```
