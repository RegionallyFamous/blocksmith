import type { Blueprint, BlueprintSection, BlueprintTemplate, Diagnostic } from "@blocksmith/schema";
import { defaultVariantFor } from "@blocksmith/sections";
import { renderPatternFile, renderPatternRef, renderSection, renderStyleVariation, renderTemplatePart, renderThemeJson } from "./render.js";
import { slugify, stableJson } from "./utils.js";

export interface CompileResult {
  files: Record<string, string>;
  diagnostics: Diagnostic[];
  themeSlug: string;
}

export function compileBlueprint(input: Blueprint): CompileResult {
  const blueprint = withDefaults(input);
  const diagnostics: Diagnostic[] = [];
  const themeSlug = slugify(blueprint.metadata.slug ?? blueprint.metadata.name);
  const textDomain = blueprint.metadata.textDomain ?? themeSlug;
  const files: Record<string, string> = {};

  files["style.css"] = renderStyleCss(blueprint, textDomain);
  files["functions.php"] = renderFunctionsPhp(themeSlug, textDomain);
  files["readme.txt"] = renderReadme(blueprint);
  files["theme.json"] = renderThemeJson(blueprint);
  files["resources.json"] = stableJson({
    generatedBy: "blocksmith",
    blueprintName: blueprint.metadata.name,
    resources: blueprint.assets ?? []
  });
  files["blocksmith.lock"] = stableJson({
    apiVersion: blueprint.apiVersion,
    policy: blueprint.policy?.profile ?? "wporg-block-theme-v1",
    target: blueprint.target,
    themeSlug,
    tasteProfile: blueprint.tasteProfile ?? "editorial-clean"
  });

  for (const [partSlug, part] of Object.entries(defaultParts(blueprint))) {
    files[`parts/${slugify(partSlug)}.html`] = renderSections(part.sections, blueprint, "part");
  }

  for (const [templateName, template] of Object.entries(defaultTemplates(blueprint))) {
    const templateSlug = slugify(templateName);
    const templateLines: string[] = [];
    template.sections.forEach((section, index) => {
      if (section.kind === "part") {
        templateLines.push(renderTemplatePart(section.ref ?? "header"));
        return;
      }

      const patternSlug = `${themeSlug}/${templateSlug}-${index + 1}-${slugify(section.kind)}`;
      const patternTitle = `${template.title ?? templateSlug} ${section.kind}`;
      files[`patterns/${templateSlug}-${index + 1}-${slugify(section.kind)}.php`] = renderPatternFile({
        title: patternTitle,
        slug: patternSlug,
        categories: ["featured"],
        content: renderSection(section, blueprint, "pattern", { template: templateSlug, sectionIndex: index })
      });
      templateLines.push(renderPatternRef(patternSlug));
    });
    files[`templates/${templateSlug}.html`] = templateLines.join("");
  }

  for (const [patternName, pattern] of Object.entries(blueprint.patterns ?? {})) {
    const patternSlug = `${themeSlug}/${slugify(patternName)}`;
    files[`patterns/${slugify(patternName)}.php`] = renderPatternFile({
      title: pattern.title ?? patternName,
      slug: patternSlug,
      categories: ["featured"],
      content: renderSections(pattern.sections, blueprint, "pattern")
    });
  }

  for (const variation of blueprint.styleVariations ?? []) {
    const variationSlug = slugify(variation.slug ?? variation.title);
    files[`styles/${variationSlug}.json`] = renderStyleVariation(variation.title, blueprint, variation.tokens);
  }

  files["assets/css/blocksmith.css"] = renderBaseCss(blueprint);
  files["playground/blueprint.json"] = renderPlaygroundBlueprint(themeSlug, blueprint.metadata.name);

  return { files, diagnostics, themeSlug };
}

export function withDefaults(input: Blueprint): Blueprint {
  const profile = input.tasteProfile ?? "editorial-clean";
  const applySectionDefaults = (section: BlueprintSection): BlueprintSection => ({
    ...section,
    variant: section.variant ?? defaultVariantFor(section.kind, profile)
  });

  const applyTemplateDefaults = (template: BlueprintTemplate): BlueprintTemplate => ({
    ...template,
    sections: template.sections.map(applySectionDefaults)
  });

  return {
    ...input,
    tasteProfile: profile,
    policy: input.policy ?? { profile: "wporg-block-theme-v1", allowRawCode: false, allowRemoteAssets: false },
    metadata: {
      version: "0.1.0",
      license: "GPL-2.0-or-later",
      author: "Blocksmith",
      ...input.metadata
    },
    parts: Object.fromEntries(Object.entries(input.parts ?? {}).map(([key, value]) => [key, applyTemplateDefaults(value)])),
    templates: Object.fromEntries(Object.entries(input.templates).map(([key, value]) => [key, applyTemplateDefaults(value)])),
    patterns: input.patterns ? Object.fromEntries(Object.entries(input.patterns).map(([key, value]) => [key, applyTemplateDefaults(value)])) : undefined
  };
}

function renderSections(sections: BlueprintSection[], blueprint: Blueprint, context: "part" | "pattern" | "template"): string {
  return sections.map((section) => renderSection(section, blueprint, context)).join("\n");
}

function defaultParts(blueprint: Blueprint): Record<string, BlueprintTemplate> {
  return {
    header: {
      title: "Header",
      sections: [{ kind: "header", variant: "standard" }]
    },
    footer: {
      title: "Footer",
      sections: [{ kind: "footer", variant: "standard" }]
    },
    ...(blueprint.parts ?? {})
  };
}

function defaultTemplates(blueprint: Blueprint): Record<string, BlueprintTemplate> {
  const frontPageSections = blueprint.templates["front-page"]?.sections ?? blueprint.templates.index?.sections ?? [
    { kind: "part", ref: "header" },
    { kind: "hero", title: blueprint.metadata.name, text: blueprint.metadata.description ?? "A focused WordPress block theme." },
    { kind: "postGrid", title: "Latest posts", query: { perPage: 6 } },
    { kind: "part", ref: "footer" }
  ];
  const postIndexSections: BlueprintSection[] = [
    { kind: "part", ref: "header" },
    { kind: "postGrid", title: "Latest posts", query: { perPage: 9 } },
    { kind: "part", ref: "footer" }
  ];
  const archiveSections: BlueprintSection[] = [
    { kind: "part", ref: "header" },
    { kind: "archiveHeader" },
    { kind: "postGrid", query: { perPage: 9 } },
    { kind: "part", ref: "footer" }
  ];
  const singleSections: BlueprintSection[] = [
    { kind: "part", ref: "header" },
    { kind: "postHeader" },
    { kind: "featuredImage" },
    { kind: "postContent" },
    {
      kind: "postGrid",
      title: "Related dispatches",
      query: { perPage: 4 }
    },
    { kind: "comments" },
    { kind: "part", ref: "footer" }
  ];
  const pageSections: BlueprintSection[] = [
    { kind: "part", ref: "header" },
    { kind: "postHeader" },
    { kind: "postContent" },
    { kind: "part", ref: "footer" }
  ];

  const base: Record<string, BlueprintTemplate> = {
    "front-page": {
      title: "Front Page",
      sections: frontPageSections
    },
    index: {
      title: "Index",
      sections: frontPageSections
    },
    home: {
      title: "Home",
      sections: postIndexSections
    },
    single: {
      title: "Single",
      sections: singleSections
    },
    "single-post": {
      title: "Single Post",
      sections: singleSections
    },
    singular: {
      title: "Singular",
      sections: singleSections
    },
    attachment: {
      title: "Attachment",
      sections: singleSections
    },
    embed: {
      title: "Embed",
      sections: singleSections
    },
    archive: {
      title: "Archive",
      sections: archiveSections
    },
    taxonomy: {
      title: "Taxonomy",
      sections: archiveSections
    },
    category: {
      title: "Category",
      sections: archiveSections
    },
    tag: {
      title: "Tag",
      sections: archiveSections
    },
    author: {
      title: "Author",
      sections: archiveSections
    },
    date: {
      title: "Date",
      sections: archiveSections
    },
    page: {
      title: "Page",
      sections: pageSections
    },
    "privacy-policy": {
      title: "Privacy Policy",
      sections: pageSections
    },
    "page-wide": {
      title: "Wide Page",
      sections: pageSections
    },
    search: {
      title: "Search",
      sections: [
        { kind: "part", ref: "header" },
        { kind: "archiveHeader" },
        { kind: "searchResults", query: { perPage: 9 } },
        { kind: "part", ref: "footer" }
      ]
    },
    "404": {
      title: "404",
      sections: [
        { kind: "part", ref: "header" },
        { kind: "notFound" },
        {
          kind: "postGrid",
          title: "Latest dispatches",
          cta: {
            label: "View more stories ->",
            url: "/category/dispatch/"
          },
          query: { perPage: 4 }
        },
        { kind: "part", ref: "footer" }
      ]
    }
  };

  return {
    ...base,
    ...blueprint.templates
  };
}

function renderStyleCss(blueprint: Blueprint, textDomain: string): string {
  return `/*
Theme Name: ${blueprint.metadata.name}
Theme URI: https://blocksmith.io/
Author: ${blueprint.metadata.author ?? "Blocksmith"}
Description: ${blueprint.metadata.description ?? "A Blocksmith generated block theme draft."}
Version: ${blueprint.metadata.version ?? "0.1.0"}
Requires at least: ${blueprint.metadata.requiresAtLeast ?? blueprint.target.wordpress.replace(/[^\d.]/g, "")}
Requires PHP: ${blueprint.metadata.requiresPhp ?? blueprint.target.php.replace(/[^\d.]/g, "")}
License: ${blueprint.metadata.license ?? "GPL-2.0-or-later"}
Text Domain: ${textDomain}
*/
`;
}

function renderFunctionsPhp(themeSlug: string, textDomain: string): string {
  const handle = `${themeSlug}-blocksmith`;
  return `<?php
/**
 * Theme setup for generated Blocksmith styles.
 */

add_action(
\t'after_setup_theme',
\tstatic function (): void {
\t\tadd_theme_support( 'wp-block-styles' );
\t\tadd_theme_support( 'responsive-embeds' );
\t\tadd_theme_support( 'editor-styles' );
\t\tadd_editor_style( 'assets/css/blocksmith.css' );
\t}
);

add_action(
\t'init',
\tstatic function (): void {
\t\tregister_block_pattern_category(
\t\t\t'blocksmith',
\t\t\tarray(
\t\t\t\t'label' => __( 'Blocksmith', '${textDomain}' ),
\t\t\t)
\t\t);
\t}
);

add_action(
\t'wp_enqueue_scripts',
\tstatic function (): void {
\t\twp_enqueue_style(
\t\t\t'${handle}',
\t\t\tget_theme_file_uri( 'assets/css/blocksmith.css' ),
\t\t\tarray(),
\t\t\twp_get_theme()->get( 'Version' )
\t\t);
\t}
);

add_filter(
\t'term_link',
\tstatic function ( string $termlink ): string {
\t\tif ( ! preg_match( '#^(https?:)?//#', $termlink ) && ! str_starts_with( $termlink, '/' ) ) {
\t\t\treturn home_url( '/' . ltrim( $termlink, '/' ) );
\t\t}

\t\treturn $termlink;
\t},
\t10,
\t1
);

add_filter(
\t'category_link',
\tstatic function ( string $link, int $term_id ): string {
\t\t$term = get_term( $term_id, 'category' );

\t\tif ( $term instanceof WP_Term ) {
\t\t\treturn home_url( '/category/' . $term->slug . '/' );
\t\t}

\t\treturn $link;
\t},
\t10,
\t2
);
`;
}

function renderReadme(blueprint: Blueprint): string {
  return `=== ${blueprint.metadata.name} ===

Contributors: blocksmith
Requires at least: ${blueprint.metadata.requiresAtLeast ?? "6.6"}
Tested up to: 6.6
Requires PHP: ${blueprint.metadata.requiresPhp ?? "8.1"}
License: ${blueprint.metadata.license ?? "GPL-2.0-or-later"}

== Description ==

${blueprint.metadata.description ?? "A Blocksmith generated block theme draft."}

Generated themes are drafts until a human accepts visual quality, accessibility, licensing, and security review.

== Resources ==

See resources.json for bundled asset provenance.
`;
}

function renderBaseCss(blueprint: Blueprint): string {
  const tokens = blueprint.tokens;
  const heroAsset = (blueprint.assets ?? []).find((asset) => asset.role === "hero");
  const fontFaces = renderFontFaces(blueprint);
  const heroArtBackground = heroAsset
    ? `background-image:
    linear-gradient(90deg, rgba(255, 253, 247, 0.18), rgba(255, 253, 247, 0)),
    url("${cssAssetUrl(heroAsset.path)}");`
    : `background-image:
    radial-gradient(circle at 35% 28%, rgba(182, 63, 45, 0.26), transparent 32%),
    linear-gradient(135deg, rgba(36, 95, 104, 0.34), rgba(241, 230, 210, 0.82));`;
  return `${fontFaces}body {
  background:
    linear-gradient(90deg, rgba(182, 63, 45, 0.024) 0 1px, transparent 1px 100%),
    linear-gradient(0deg, rgba(23, 19, 15, 0.018) 0 1px, transparent 1px 100%),
    linear-gradient(180deg, rgba(255, 253, 247, 0.96), rgba(247, 238, 223, 0.42)),
    var(--wp--preset--color--base, ${tokens.color.base});
  background-size: 112px 112px, 112px 112px, auto, auto;
  color: var(--wp--preset--color--contrast, ${tokens.color.contrast});
  text-rendering: optimizeLegibility;
}

.wp-site-blocks {
  overflow-x: hidden;
  padding-left: clamp(1rem, 4vw, 3rem);
  padding-right: clamp(1rem, 4vw, 3rem);
}

.blocksmith-header {
  border-bottom: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  color: var(--wp--preset--color--contrast, ${tokens.color.contrast});
  display: block;
  margin-bottom: var(--wp--preset--spacing--lg);
  padding: 0;
}

.blocksmith-header-top {
  align-items: center;
  background: var(--wp--preset--color--primary, ${tokens.color.primary});
  color: var(--wp--preset--color--base, ${tokens.color.base});
  display: flex;
  font-size: 0.78rem;
  font-weight: 800;
  justify-content: space-between;
  padding: 0.62rem clamp(1rem, 4vw, 3rem);
  text-transform: uppercase;
}

.blocksmith-masthead-row {
  align-items: center;
  display: grid;
  gap: var(--wp--preset--spacing--md);
  grid-template-columns: minmax(8rem, 1fr) minmax(0, 2.6fr) minmax(8rem, 1fr);
  margin-left: auto;
  margin-right: auto;
  max-width: var(--wp--style--global--wide-size, ${tokens.layout.wideSize});
  min-height: 10.5rem;
  padding: var(--wp--preset--spacing--lg) 0 var(--wp--preset--spacing--sm);
}

.blocksmith-masthead-note {
  border-bottom: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  border-top: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.55;
  margin: 0;
  padding: 1rem 0;
  text-transform: uppercase;
}

.blocksmith-masthead-note-right {
  text-align: right;
}

.blocksmith-site-brand {
  text-align: center;
}

.blocksmith-site-brand .wp-block-site-title {
  font-family: var(--wp--preset--font-family--heading);
  font-size: 4.45rem;
  font-weight: 800;
  line-height: 0.92;
  margin: 0;
  text-transform: uppercase;
}

.blocksmith-site-brand .wp-block-site-title a {
  color: inherit;
  text-decoration: none;
}

.blocksmith-dispatch-mark {
  color: var(--wp--preset--color--primary, ${tokens.color.primary});
  font-family: var(--wp--preset--font-family--body);
  font-size: 1rem;
  font-weight: 800;
  margin: 0.65rem 0 0;
  text-transform: uppercase;
}

.blocksmith-nav-row {
  align-items: center;
  display: flex;
  gap: var(--wp--preset--spacing--md);
  justify-content: space-between;
  margin-left: auto;
  margin-right: auto;
  max-width: var(--wp--style--global--wide-size, ${tokens.layout.wideSize});
  padding: 0.9rem 0 1rem;
}

.blocksmith-search-label {
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
}

.blocksmith-hero {
  border: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  border-radius: ${tokens.radius?.lg ?? "8px"};
  box-shadow: ${tokens.shadow?.md ?? "0 22px 56px rgba(23, 19, 15, 0.12)"};
  background: var(--wp--preset--color--surface, ${tokens.color.surface ?? "#ffffff"});
  margin-left: auto;
  margin-right: auto;
  margin-top: 0;
  margin-bottom: var(--wp--preset--spacing--xl);
  max-width: var(--wp--style--global--wide-size, ${tokens.layout.wideSize});
  overflow: hidden;
  padding: 0;
}

.blocksmith-hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(17rem, 0.94fr) minmax(15rem, 0.58fr);
  min-height: 38rem;
}

.blocksmith-hero-copy {
  align-self: center;
  min-width: 0;
  padding: var(--wp--preset--spacing--xl) var(--wp--preset--spacing--lg);
}

.blocksmith-hero-art {
  ${heroArtBackground}
  background-position: center;
  background-size: cover;
  border-left: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  border-right: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  min-height: 100%;
  position: relative;
}

.blocksmith-hero-art span {
  background: rgba(23, 19, 15, 0.82);
  color: var(--wp--preset--color--base, ${tokens.color.base});
  font-size: 0.8rem;
  font-weight: 800;
  left: 50%;
  padding: 0.45rem 0.65rem;
  position: absolute;
  text-transform: uppercase;
  top: 46%;
  transform: translate(-50%, -50%);
}

.blocksmith-hero .wp-block-buttons {
  margin-top: var(--wp--preset--spacing--lg);
}

.blocksmith-hero h1 {
  font-size: 3.65rem;
  letter-spacing: 0;
  line-height: 0.98;
  max-width: none;
  margin-bottom: 1rem;
}

.blocksmith-hero p:not(.blocksmith-eyebrow) {
  font-size: 1.13rem;
  line-height: 1.62;
  max-width: 32rem;
}

.blocksmith-issue-note {
  background: var(--wp--preset--color--secondary, ${tokens.color.secondary ?? tokens.color.primary});
  color: var(--wp--preset--color--base, ${tokens.color.base});
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: var(--wp--preset--spacing--xl) var(--wp--preset--spacing--md);
}

.blocksmith-issue-note h2 {
  color: inherit;
  font-size: 2.1rem;
  margin: 0 0 1rem;
}

.blocksmith-issue-note p,
.blocksmith-issue-note li {
  color: inherit;
}

.blocksmith-issue-note ul {
  border-bottom: 1px solid rgba(255, 253, 247, 0.34);
  border-top: 1px solid rgba(255, 253, 247, 0.34);
  list-style: none;
  margin: 1.5rem 0;
  padding: 1rem 0;
}

.blocksmith-issue-note a {
  color: inherit;
  font-weight: 800;
  text-transform: uppercase;
}

.blocksmith-mini-label,
.blocksmith-card-kicker,
.blocksmith-eyebrow,
.blocksmith-footer-label {
  color: var(--wp--preset--color--primary, ${tokens.color.primary});
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

.blocksmith-intro {
  margin-left: auto;
  margin-right: auto;
  max-width: 780px;
  padding-bottom: var(--wp--preset--spacing--xl);
  padding-top: var(--wp--preset--spacing--xl);
}

.blocksmith-feature-grid {
  margin-left: auto;
  margin-right: auto;
  max-width: var(--wp--style--global--wide-size, ${tokens.layout.wideSize});
  padding-bottom: var(--wp--preset--spacing--xl);
  padding-top: 0;
}

.blocksmith-feature-grid .wp-block-columns {
  display: grid;
  gap: var(--wp--preset--spacing--md);
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.blocksmith-card,
.blocksmith-post-card {
  background: var(--wp--preset--color--surface, ${tokens.color.surface ?? "#ffffff"});
  border: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  border-radius: ${tokens.radius?.md ?? "4px"};
  box-shadow: ${tokens.shadow?.sm ?? "0 10px 28px rgba(23, 19, 15, 0.08)"};
  min-height: 100%;
  overflow: hidden;
  padding: var(--wp--preset--spacing--md);
}

.blocksmith-card {
  display: flex;
  flex-direction: column;
}

.blocksmith-card::before {
  background:
    linear-gradient(135deg, rgba(36, 95, 104, 0.45), rgba(182, 63, 45, 0.12)),
    var(--wp--preset--color--muted, ${tokens.color.muted ?? "#f4f4f4"});
  content: "";
  display: block;
  height: 9.5rem;
  margin: calc(-1 * var(--wp--preset--spacing--md)) calc(-1 * var(--wp--preset--spacing--md)) var(--wp--preset--spacing--md);
}

.blocksmith-card-2::before {
  background:
    linear-gradient(135deg, rgba(23, 19, 15, 0.45), rgba(36, 95, 104, 0.16)),
    var(--wp--preset--color--muted, ${tokens.color.muted ?? "#f4f4f4"});
}

.blocksmith-card-3::before {
  background:
    linear-gradient(135deg, rgba(182, 63, 45, 0.24), rgba(241, 230, 210, 0.88)),
    var(--wp--preset--color--muted, ${tokens.color.muted ?? "#f4f4f4"});
}

.blocksmith-card h3 {
  font-size: 2rem;
  line-height: 1;
  margin-bottom: 0.8rem;
  margin-top: 0;
}

.blocksmith-card-link {
  font-size: 0.82rem;
  font-weight: 900;
  margin-top: auto;
  text-transform: uppercase;
}

.blocksmith-cta {
  align-items: center;
  background: var(--wp--preset--color--primary, ${tokens.color.primary});
  color: var(--wp--preset--color--base, ${tokens.color.base});
  display: grid;
  gap: var(--wp--preset--spacing--md);
  grid-template-columns: 5rem minmax(0, 1fr) auto;
  margin-bottom: 0;
  margin-top: 0;
  padding: var(--wp--preset--spacing--lg) clamp(1rem, 4vw, 3rem);
}

.blocksmith-cta h2,
.blocksmith-cta p {
  color: inherit;
  margin: 0;
}

.blocksmith-cta h2 {
  font-size: 2.65rem;
}

.blocksmith-cta-icon {
  border: 2px solid rgba(255, 253, 247, 0.7);
  height: 3.5rem;
  position: relative;
  width: 4.5rem;
}

.blocksmith-cta-icon::before {
  border-bottom: 2px solid rgba(255, 253, 247, 0.7);
  border-left: 2px solid rgba(255, 253, 247, 0.7);
  content: "";
  height: 2rem;
  left: 0.95rem;
  position: absolute;
  top: 0.25rem;
  transform: rotate(-45deg);
  width: 2rem;
}

.wp-block-button__link,
.wp-element-button {
  background: var(--wp--preset--color--button-bg, ${tokens.color.buttonBg ?? tokens.color.primary});
  border-radius: ${tokens.radius?.sm ?? "2px"};
  color: var(--wp--preset--color--button-text, ${tokens.color.buttonText ?? "#ffffff"});
  display: inline-block;
  font-weight: 800;
  padding: 0.85rem 1.25rem;
  text-decoration: none;
  text-transform: uppercase;
}

.blocksmith-hero .wp-block-button__link {
  background: var(--wp--preset--color--primary, ${tokens.color.primary});
}

.wp-block-query {
  margin-left: auto;
  margin-right: auto;
  max-width: var(--wp--style--global--wide-size, ${tokens.layout.wideSize});
  padding-bottom: var(--wp--preset--spacing--xl);
  padding-top: var(--wp--preset--spacing--xl);
}

.blocksmith-section-heading {
  align-items: center;
  border-top: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  margin-bottom: var(--wp--preset--spacing--md);
  padding-top: 1.15rem;
}

.blocksmith-section-heading h2 {
  flex: 1;
  font-family: var(--wp--preset--font-family--body);
  font-size: 1.05rem;
  margin: 0;
  text-transform: uppercase;
}

.blocksmith-section-heading > span {
  color: var(--wp--preset--color--primary, ${tokens.color.primary});
  font-weight: 900;
}

.blocksmith-section-heading a {
  font-size: 0.82rem;
  font-weight: 800;
  text-transform: uppercase;
}

.wp-block-post-template {
  display: grid;
  gap: var(--wp--preset--spacing--md);
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  list-style: none;
  padding-left: 0;
}

.wp-block-post-template > li {
  display: flex;
}

.blocksmith-post-card {
  display: flex;
  flex-direction: column;
  padding: 0;
  width: 100%;
}

.blocksmith-post-card-media {
  background:
    linear-gradient(135deg, rgba(36, 95, 104, 0.38), rgba(182, 63, 45, 0.18)),
    var(--wp--preset--color--muted, ${tokens.color.muted ?? "#f4f4f4"});
  min-height: 8.5rem;
}

.wp-block-post-template > li:nth-child(2n) .blocksmith-post-card-media {
  background:
    linear-gradient(135deg, rgba(182, 63, 45, 0.36), rgba(241, 230, 210, 0.78)),
    var(--wp--preset--color--muted, ${tokens.color.muted ?? "#f4f4f4"});
}

.wp-block-post-template > li:nth-child(3n) .blocksmith-post-card-media {
  background:
    linear-gradient(135deg, rgba(23, 19, 15, 0.44), rgba(36, 95, 104, 0.22)),
    var(--wp--preset--color--muted, ${tokens.color.muted ?? "#f4f4f4"});
}

.blocksmith-post-card > *:not(.blocksmith-post-card-media) {
  margin-left: var(--wp--preset--spacing--md);
  margin-right: var(--wp--preset--spacing--md);
}

.blocksmith-post-card h3 {
  font-size: 1.32rem;
  line-height: 1.12;
  margin-bottom: 0.55rem;
  margin-top: var(--wp--preset--spacing--md);
}

.blocksmith-post-card .wp-block-post-excerpt {
  margin-bottom: var(--wp--preset--spacing--md);
}

.blocksmith-post-card .wp-block-post-date {
  border-top: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  margin-top: auto;
  padding-bottom: var(--wp--preset--spacing--sm);
  padding-top: var(--wp--preset--spacing--sm);
}

.blocksmith-query-empty {
  border: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  border-radius: ${tokens.radius?.md ?? "4px"};
  margin-top: var(--wp--preset--spacing--md);
  padding: var(--wp--preset--spacing--md);
}

.blocksmith-archive-header,
.blocksmith-post-header,
.blocksmith-not-found {
  border-bottom: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  margin: 0 auto;
  max-width: var(--wp--style--global--wide-size, ${tokens.layout.wideSize});
  padding-bottom: var(--wp--preset--spacing--lg);
  padding-top: var(--wp--preset--spacing--md);
}

.blocksmith-archive-header h1,
.blocksmith-post-header h1,
.blocksmith-not-found h1 {
  font-size: 3rem;
  line-height: 1;
  margin-bottom: 0.75rem;
  max-width: 820px;
}

.blocksmith-post-header .wp-block-post-date {
  color: var(--wp--preset--color--primary, ${tokens.color.primary});
  font-weight: 800;
  text-transform: uppercase;
}

.wp-block-post-content {
  margin-bottom: var(--wp--preset--spacing--xl);
  margin-top: var(--wp--preset--spacing--lg);
}

.wp-block-post-content p {
  max-width: var(--wp--style--global--content-size, ${tokens.layout.contentSize});
}

.blocksmith-query-empty h2 {
  font-size: 1.5rem;
  margin-top: 0;
}

.blocksmith-editor-note {
  align-items: center;
  background: var(--wp--preset--color--muted, ${tokens.color.muted ?? "#f4f4f4"});
  border-bottom: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  border-top: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  display: grid;
  gap: var(--wp--preset--spacing--lg);
  grid-template-columns: minmax(8rem, 0.45fr) minmax(0, 1.3fr) minmax(14rem, 0.65fr);
  padding: var(--wp--preset--spacing--lg) clamp(1rem, 4vw, 3rem);
}

.blocksmith-note-mark {
  border: 1px solid rgba(182, 63, 45, 0.45);
  height: 7rem;
  position: relative;
}

.blocksmith-note-mark::before {
  background: var(--wp--preset--color--primary, ${tokens.color.primary});
  content: "";
  height: 1px;
  left: 18%;
  position: absolute;
  top: 50%;
  transform: rotate(-17deg);
  width: 64%;
}

.blocksmith-note-quote h2 {
  font-size: 2.65rem;
  margin: 0 0 0.75rem;
}

.blocksmith-note-aside {
  border-left: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  padding-left: var(--wp--preset--spacing--md);
}

.blocksmith-footer {
  border-top: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  display: block;
  margin-top: 0;
  padding: var(--wp--preset--spacing--lg) 0 var(--wp--preset--spacing--sm);
}

.blocksmith-footer-grid {
  display: grid;
  gap: var(--wp--preset--spacing--lg);
  grid-template-columns: minmax(0, 1.2fr) repeat(2, minmax(8rem, 0.65fr)) minmax(14rem, 1.05fr);
  margin-left: auto;
  margin-right: auto;
  max-width: var(--wp--style--global--wide-size, ${tokens.layout.wideSize});
}

.blocksmith-footer a {
  display: block;
  margin-top: 0.35rem;
}

.blocksmith-footer-card {
  background: var(--wp--preset--color--secondary, ${tokens.color.secondary ?? tokens.color.primary});
  color: var(--wp--preset--color--base, ${tokens.color.base});
  padding: var(--wp--preset--spacing--md);
}

.blocksmith-footer-card p,
.blocksmith-footer-card a {
  color: inherit;
}

.blocksmith-footer-bottom {
  border-top: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  display: flex;
  font-size: 0.82rem;
  justify-content: space-between;
  margin: var(--wp--preset--spacing--lg) auto 0;
  max-width: var(--wp--style--global--wide-size, ${tokens.layout.wideSize});
  padding-top: var(--wp--preset--spacing--sm);
}

:where(a:focus-visible, button:focus-visible, .wp-element-button:focus-visible) {
  outline: 3px solid var(--wp--preset--color--focus, ${tokens.color.focus ?? tokens.color.primary});
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  * {
    scroll-behavior: auto !important;
  }
}

@media (max-width: 980px) {
  .blocksmith-header {
    margin-bottom: var(--wp--preset--spacing--md);
  }

  .blocksmith-masthead-row,
  .blocksmith-hero-grid,
  .blocksmith-editor-note,
  .blocksmith-footer-grid {
    grid-template-columns: 1fr;
  }

  .blocksmith-masthead-note,
  .blocksmith-masthead-note-right,
  .blocksmith-site-brand {
    text-align: left;
  }

  .blocksmith-masthead-row {
    gap: var(--wp--preset--spacing--sm);
    min-height: 0;
    padding: var(--wp--preset--spacing--md) 0 var(--wp--preset--spacing--sm);
  }

  .blocksmith-masthead-note {
    font-size: 0.82rem;
    padding: 0.8rem 0;
  }

  .blocksmith-site-brand .wp-block-site-title,
  .blocksmith-hero h1 {
    font-size: 2.05rem;
  }

  .blocksmith-hero-grid {
    min-height: 0;
  }

  .blocksmith-hero {
    margin-bottom: var(--wp--preset--spacing--lg);
  }

  .blocksmith-hero-copy,
  .blocksmith-issue-note {
    padding: var(--wp--preset--spacing--lg) var(--wp--preset--spacing--md);
  }

  .blocksmith-hero-art {
    border-left: 0;
    border-right: 0;
    min-height: 18rem;
  }

  .blocksmith-cta {
    grid-template-columns: 1fr;
  }

  .wp-block-query,
  .blocksmith-intro,
  .blocksmith-feature-grid,
  .wp-block-post-content {
    padding-bottom: var(--wp--preset--spacing--lg);
    padding-top: var(--wp--preset--spacing--lg);
  }

  .blocksmith-archive-header,
  .blocksmith-post-header,
  .blocksmith-not-found {
    padding-bottom: var(--wp--preset--spacing--md);
    padding-top: var(--wp--preset--spacing--md);
  }

  .blocksmith-footer-bottom {
    flex-direction: column;
    gap: 0.5rem;
  }
}

@media (max-width: 760px) {
  .blocksmith-feature-grid .wp-block-columns,
  .wp-block-post-template {
    grid-template-columns: 1fr;
  }

  .blocksmith-header-top,
  .blocksmith-nav-row,
  .blocksmith-section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .blocksmith-header-top,
  .blocksmith-cta,
  .blocksmith-editor-note {
    padding-left: var(--wp--preset--spacing--sm);
    padding-right: var(--wp--preset--spacing--sm);
  }

  .blocksmith-nav-row {
    gap: var(--wp--preset--spacing--sm);
  }

  .blocksmith-cta h2,
  .blocksmith-note-quote h2 {
    font-size: 2rem;
  }
}

/* Route-family polish derived from the Regionally Famous Imagegen comps. */
.blocksmith-template-kicker,
.blocksmith-breadcrumbs,
.blocksmith-post-card-terms,
.blocksmith-post-meta-list,
.blocksmith-post-share {
  color: var(--wp--preset--color--primary, ${tokens.color.primary});
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

.blocksmith-header {
  background: rgba(255, 253, 247, 0.94);
  box-shadow: 0 1px 0 rgba(23, 19, 15, 0.08);
}

.blocksmith-header-top {
  background: var(--wp--preset--color--secondary, ${tokens.color.secondary ?? tokens.color.primary});
}

.blocksmith-masthead-row {
  min-height: 9.2rem;
  padding-bottom: 1rem;
  padding-top: 2.4rem;
}

.blocksmith-site-brand .wp-block-site-title {
  color: var(--wp--preset--color--contrast, ${tokens.color.contrast});
  font-size: 4rem;
}

.blocksmith-dispatch-mark {
  color: var(--wp--preset--color--primary, ${tokens.color.primary});
}

.blocksmith-nav-row {
  border-top: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
}

.blocksmith-site-nav .wp-block-navigation-item__content {
  padding: 0.25rem 0;
}

.blocksmith-site-search .wp-block-search__inside-wrapper,
.blocksmith-archive-search .wp-block-search__inside-wrapper,
.blocksmith-recovery-panel .wp-block-search__inside-wrapper,
.blocksmith-query-empty .wp-block-search__inside-wrapper {
  border: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  border-radius: ${tokens.radius?.sm ?? "3px"};
  overflow: hidden;
}

.blocksmith-site-search .wp-block-search__button,
.blocksmith-archive-search .wp-block-search__button,
.blocksmith-recovery-panel .wp-block-search__button,
.blocksmith-query-empty .wp-block-search__button {
  border-radius: 0;
  margin-left: 0;
}

.blocksmith-archive-header {
  display: grid;
  gap: var(--wp--preset--spacing--md);
  grid-template-columns: minmax(0, 1.35fr) minmax(18rem, 0.65fr);
  padding-bottom: var(--wp--preset--spacing--lg);
  padding-top: var(--wp--preset--spacing--lg);
}

.blocksmith-archive-header .blocksmith-template-kicker,
.blocksmith-archive-header h1,
.blocksmith-archive-header .wp-block-term-description {
  grid-column: 1;
}

.blocksmith-archive-header h1 {
  font-size: 4rem;
  margin: 0;
}

.blocksmith-archive-header .wp-block-term-description {
  max-width: 38rem;
}

.blocksmith-archive-tools {
  align-self: end;
  border: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  border-radius: ${tokens.radius?.md ?? "6px"};
  display: grid;
  gap: var(--wp--preset--spacing--sm);
  grid-column: 2;
  grid-row: 1 / span 3;
  padding: var(--wp--preset--spacing--md);
}

.blocksmith-topic-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.blocksmith-topic-links a {
  border: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  border-radius: ${tokens.radius?.sm ?? "3px"};
  color: var(--wp--preset--color--contrast, ${tokens.color.contrast});
  font-size: 0.78rem;
  font-weight: 800;
  padding: 0.42rem 0.58rem;
  text-decoration: none;
}

.blocksmith-topic-links-large {
  justify-content: center;
  margin-top: var(--wp--preset--spacing--md);
}

.blocksmith-post-header {
  display: grid;
  gap: var(--wp--preset--spacing--lg);
  grid-template-columns: minmax(12rem, 0.36fr) minmax(0, 1fr);
  padding-bottom: var(--wp--preset--spacing--lg);
  padding-top: var(--wp--preset--spacing--lg);
}

.blocksmith-post-meta-rail {
  border-right: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  display: flex;
  flex-direction: column;
  gap: var(--wp--preset--spacing--sm);
  padding-right: var(--wp--preset--spacing--md);
}

.blocksmith-breadcrumbs {
  color: var(--wp--preset--color--contrast, ${tokens.color.contrast});
  display: flex;
  flex-wrap: wrap;
  gap: 0.42rem;
}

.blocksmith-post-meta-list {
  display: grid;
  gap: 0.42rem;
}

.blocksmith-post-meta-list a,
.blocksmith-post-share a,
.blocksmith-breadcrumbs a {
  color: inherit;
  text-decoration: none;
}

.blocksmith-post-share {
  border-top: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  display: grid;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: var(--wp--preset--spacing--sm);
}

.blocksmith-post-title-stack h1 {
  font-size: 4.45rem;
  line-height: 0.98;
  margin: 0 0 var(--wp--preset--spacing--sm);
}

.blocksmith-post-title-stack .wp-block-post-excerpt {
  font-size: 1.25rem;
  line-height: 1.52;
  margin: 0;
  max-width: 42rem;
}

.blocksmith-page-header {
  grid-template-columns: minmax(8rem, 0.26fr) minmax(0, 1fr);
}

.blocksmith-featured-image {
  margin-bottom: var(--wp--preset--spacing--lg);
  margin-top: 0;
  max-width: var(--wp--style--global--wide-size, ${tokens.layout.wideSize});
}

.blocksmith-featured-image img {
  border: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  border-radius: ${tokens.radius?.md ?? "6px"};
  max-height: 34rem;
  object-fit: cover;
  width: 100%;
}

.blocksmith-post-content {
  font-size: 1.08rem;
}

.blocksmith-post-content > :first-child::first-letter {
  background: var(--wp--preset--color--primary, ${tokens.color.primary});
  color: var(--wp--preset--color--base, ${tokens.color.base});
  float: left;
  font-family: var(--wp--preset--font-family--heading);
  font-size: 3.2rem;
  line-height: 0.88;
  margin: 0.28rem 0.62rem 0 0;
  padding: 0.24rem 0.42rem 0.18rem;
}

.blocksmith-query {
  padding-top: var(--wp--preset--spacing--lg);
}

.blocksmith-query .wp-block-post-template {
  gap: var(--wp--preset--spacing--md);
}

.blocksmith-query-home .wp-block-post-template {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.blocksmith-query-archive .wp-block-post-template {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.blocksmith-query-related .wp-block-post-template {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.blocksmith-post-card {
  border-radius: ${tokens.radius?.md ?? "6px"};
  box-shadow: none;
}

.blocksmith-post-card-media {
  min-height: 10rem;
}

.blocksmith-post-card-archive .blocksmith-post-card-media {
  min-height: 11rem;
}

.blocksmith-post-card-related .blocksmith-post-card-media {
  min-height: 8rem;
}

.blocksmith-post-card-terms {
  margin-bottom: 0;
  margin-top: var(--wp--preset--spacing--sm);
}

.blocksmith-post-card-terms a {
  color: inherit;
  text-decoration: none;
}

.blocksmith-post-card h3 {
  font-size: 1.42rem;
  line-height: 1.08;
  margin-top: 0.45rem;
}

.blocksmith-post-card-related h3 {
  font-size: 1.18rem;
}

.blocksmith-query-empty,
.blocksmith-recovery-panel {
  background: rgba(255, 255, 255, 0.52);
  border: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  border-radius: ${tokens.radius?.md ?? "6px"};
  padding: var(--wp--preset--spacing--md);
}

.blocksmith-not-found {
  text-align: center;
}

.blocksmith-not-found h1 {
  font-size: 4.25rem;
  margin-left: auto;
  margin-right: auto;
}

.blocksmith-recovery-panel {
  margin: var(--wp--preset--spacing--lg) auto 0;
  max-width: 58rem;
  text-align: left;
}

.blocksmith-recovery-panel h2 {
  font-size: 1.55rem;
  margin-top: 0;
}

.blocksmith-footer {
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0)),
    var(--wp--preset--color--secondary, ${tokens.color.secondary ?? tokens.color.primary});
  border-top: 0;
  color: var(--wp--preset--color--base, ${tokens.color.base});
  padding-bottom: var(--wp--preset--spacing--md);
}

.blocksmith-footer a,
.blocksmith-footer p,
.blocksmith-footer .wp-block-site-title,
.blocksmith-footer-bottom,
.blocksmith-footer-label {
  color: inherit;
}

.blocksmith-footer-card {
  background: rgba(255, 253, 247, 0.1);
  border: 1px solid rgba(255, 253, 247, 0.22);
}

.blocksmith-footer-bottom {
  border-top-color: rgba(255, 253, 247, 0.22);
}

@media (max-width: 980px) {
  .blocksmith-archive-header,
  .blocksmith-post-header,
  .blocksmith-page-header {
    grid-template-columns: 1fr;
  }

  .blocksmith-archive-header .blocksmith-template-kicker,
  .blocksmith-archive-header h1,
  .blocksmith-archive-header .wp-block-term-description,
  .blocksmith-archive-tools {
    grid-column: auto;
    grid-row: auto;
  }

  .blocksmith-post-meta-rail {
    border-bottom: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
    border-right: 0;
    padding-bottom: var(--wp--preset--spacing--sm);
    padding-right: 0;
  }

  .blocksmith-post-title-stack h1,
  .blocksmith-archive-header h1,
  .blocksmith-not-found h1 {
    font-size: 3rem;
  }

  .blocksmith-query-home .wp-block-post-template,
  .blocksmith-query-archive .wp-block-post-template,
  .blocksmith-query-related .wp-block-post-template {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .wp-site-blocks {
    padding-left: 0;
    padding-right: 0;
  }

  .wp-site-blocks > *:not(.alignfull),
  .blocksmith-masthead-row,
  .blocksmith-nav-row,
  .blocksmith-hero,
  .blocksmith-feature-grid,
  .blocksmith-intro,
  .wp-block-query,
  .blocksmith-archive-header,
  .blocksmith-post-header,
  .blocksmith-not-found,
  .blocksmith-featured-image,
  .blocksmith-post-content,
  .wp-block-comments {
    margin-left: 1rem;
    margin-right: 1rem;
  }

  .blocksmith-header-top {
    display: none;
  }

  .blocksmith-masthead-row {
    border-bottom: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
    display: block;
    padding: 0.85rem 0;
    text-align: center;
  }

  .blocksmith-masthead-note {
    display: none;
  }

  .blocksmith-site-brand,
  .blocksmith-masthead-note-right {
    text-align: center;
  }

  .blocksmith-site-brand .wp-block-site-title {
    font-size: 1.72rem;
    line-height: 0.95;
  }

  .blocksmith-dispatch-mark {
    font-size: 0.72rem;
    margin-top: 0.28rem;
  }

  .blocksmith-nav-row {
    align-items: center;
    flex-direction: row;
    gap: 0.65rem;
    padding: 0.62rem 0 0.72rem;
  }

  .blocksmith-site-nav {
    flex: 1;
  }

  .blocksmith-site-search {
    flex: 0 0 auto;
  }

  .blocksmith-hero-grid {
    grid-template-columns: 1fr;
  }

  .blocksmith-hero-copy {
    padding: var(--wp--preset--spacing--md);
  }

  .blocksmith-hero h1 {
    font-size: 2.35rem;
  }

  .blocksmith-hero-art {
    min-height: 16rem;
    order: -1;
  }

  .blocksmith-issue-note {
    padding: var(--wp--preset--spacing--md);
  }

  .blocksmith-feature-grid .wp-block-columns,
  .blocksmith-query-home .wp-block-post-template,
  .blocksmith-query-related .wp-block-post-template {
    grid-template-columns: 1fr;
  }

  .blocksmith-query-archive .wp-block-post-template {
    grid-template-columns: 1fr;
  }

  .blocksmith-query-archive .blocksmith-post-card {
    display: grid;
    grid-template-columns: 8rem minmax(0, 1fr);
  }

  .blocksmith-query-archive .blocksmith-post-card-media {
    grid-row: 1 / span 4;
    min-height: 100%;
  }

  .blocksmith-query-archive .blocksmith-post-card > *:not(.blocksmith-post-card-media) {
    margin-left: var(--wp--preset--spacing--sm);
    margin-right: var(--wp--preset--spacing--sm);
  }

  .blocksmith-query-archive .blocksmith-post-card h3 {
    font-size: 1.18rem;
  }

  .blocksmith-post-title-stack h1,
  .blocksmith-archive-header h1,
  .blocksmith-not-found h1 {
    font-size: 2.35rem;
  }

  .blocksmith-post-content {
    font-size: 1rem;
  }

  .blocksmith-post-content > :first-child::first-letter {
    font-size: 2.35rem;
  }

  .blocksmith-footer {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}
`;
}

function renderFontFaces(blueprint: Blueprint): string {
  const faces = (blueprint.assets ?? [])
    .filter((asset) => asset.role === "font" && asset.fontFamily)
    .map((asset) => `@font-face {
  font-family: "${cssString(asset.fontFamily ?? "")}";
  src: url("${cssAssetUrl(asset.path)}") format("${fontFormat(asset.path)}");
  font-weight: ${asset.fontWeight ?? "400"};
  font-style: ${asset.fontStyle ?? "normal"};
  font-display: ${asset.fontDisplay ?? "swap"};
}`);

  return faces.length ? `${faces.join("\n\n")}\n\n` : "";
}

function cssString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function fontFormat(path: string): string {
  if (path.endsWith(".woff2")) {
    return "woff2";
  }
  if (path.endsWith(".woff")) {
    return "woff";
  }
  if (path.endsWith(".ttf")) {
    return "truetype";
  }
  return "opentype";
}

function cssAssetUrl(themePath: string): string {
  if (themePath.startsWith("assets/")) {
    return `../${themePath.slice("assets/".length)}`;
  }
  return themePath;
}

function renderPlaygroundBlueprint(themeSlug: string, siteTitle: string): string {
  return stableJson({
    $schema: "https://playground.wordpress.net/blueprint-schema.json",
    landingPage: "/",
    preferredVersions: {
      php: "8.4",
      wp: "latest"
    },
    features: {
      networking: false
    },
    steps: [
      {
        step: "login",
        username: "admin",
        password: "password"
      },
      {
        step: "installTheme",
        themeData: {
          resource: "bundled",
          path: "/theme.zip"
        },
        options: {
          activate: true
        }
      },
      {
        step: "setSiteOptions",
        options: {
          blogname: siteTitle,
          stylesheet: themeSlug,
          template: themeSlug
        }
      },
      {
        step: "runPHP",
        code: renderStarterContentPhp()
      }
    ]
  });
}

function renderStarterContentPhp(): string {
  return `<?php
require '/wordpress/wp-load.php';

$existing = get_posts(array(
    'numberposts' => -1,
    'post_type' => array('post', 'page'),
    'post_status' => 'any',
));

foreach ($existing as $post) {
    wp_delete_post($post->ID, true);
}

$author = get_user_by('login', 'admin');
$author_id = $author ? (int) $author->ID : 1;

$pages = array(
    array('title' => 'Regionally Famous Home', 'slug' => 'home', 'content' => '<p>The front page uses the theme front-page.html template.</p>'),
    array('title' => 'Dispatches', 'slug' => 'dispatches', 'content' => '<p>Browse the Dispatch category archive for the live WordPress loop.</p>'),
    array('title' => 'About Regionally Famous', 'slug' => 'about', 'content' => '<p>Regionally Famous Dispatch is an independent local publication about places, people, and small legends worth remembering.</p>'),
    array('title' => 'Support Us', 'slug' => 'support-us', 'content' => '<p>Reader support keeps the dispatch independent, useful, and rooted in the community.</p>'),
    array('title' => 'Advertise', 'slug' => 'advertise', 'content' => '<p>Reach curious local readers with calm, high-trust sponsorship placements.</p>'),
    array('title' => 'Contact', 'slug' => 'contact', 'content' => '<p>Send story tips, corrections, and neighborhood notes to the editorial desk.</p>'),
    array('title' => 'Subscribe', 'slug' => 'subscribe', 'content' => '<p>Sign up for the weekly dispatch of local stories, recommendations, and field notes.</p>'),
    array('title' => 'Shop', 'slug' => 'shop', 'content' => '<p>Field totes, notebooks, and practical goods for everyday local errands.</p>'),
    array('title' => 'Privacy Policy', 'slug' => 'privacy-policy', 'content' => '<p>This sample privacy policy exists so the privacy-policy.html template can be verified in Playground.</p>'),
);

$page_ids = array();
foreach ($pages as $page) {
    $page_id = wp_insert_post(array(
        'post_title' => $page['title'],
        'post_name' => $page['slug'],
        'post_content' => $page['content'],
        'post_status' => 'publish',
        'post_type' => 'page',
        'post_author' => $author_id,
    ));

    if (!is_wp_error($page_id)) {
        $page_ids[$page['slug']] = (int) $page_id;
    }
}

if (!empty($page_ids['privacy-policy'])) {
    update_option('wp_page_for_privacy_policy', $page_ids['privacy-policy']);
}

$category_slugs = array(
    'Dispatch' => 'dispatch',
    'Place notes' => 'place-notes',
    'People features' => 'people-features',
    'Small legends' => 'small-legends',
    'Guides' => 'guides',
);

foreach ($category_slugs as $name => $slug) {
    if (!term_exists($slug, 'category')) {
        wp_insert_term($name, 'category', array('slug' => $slug));
    }
}

$tag_slugs = array(
    'Local' => 'local',
    'Markets' => 'markets',
    'Cinema' => 'cinema',
    'Schools' => 'schools',
    'Music' => 'music',
    'Food' => 'food',
);

foreach ($tag_slugs as $name => $slug) {
    if (!term_exists($slug, 'post_tag')) {
        wp_insert_term($name, 'post_tag', array('slug' => $slug));
    }
}

$stories = array(
    array(
        'title' => 'Market day on 4th Street',
        'slug' => 'market-day-on-4th-street',
        'excerpt' => 'Radishes, gossip, and the old folding table that anchors Saturday morning.',
        'categories' => array('Dispatch', 'Place notes'),
        'tags' => array('Local', 'Markets', 'Food'),
        'date' => '2026-06-18 09:00:00',
    ),
    array(
        'title' => 'An old cinema gets new life',
        'slug' => 'an-old-cinema-gets-new-life',
        'excerpt' => 'The marquee is lit again, and the neighborhood remembers how to line up.',
        'categories' => array('Dispatch', 'Place notes'),
        'tags' => array('Local', 'Cinema'),
        'date' => '2026-06-14 09:00:00',
    ),
    array(
        'title' => 'A teacher with the long view',
        'slug' => 'a-teacher-with-the-long-view',
        'excerpt' => 'A careful conversation about classrooms, corner stores, and civic patience.',
        'categories' => array('Dispatch', 'People features'),
        'tags' => array('Local', 'Schools'),
        'date' => '2026-06-10 09:00:00',
    ),
    array(
        'title' => 'The brass band of Whitman Park',
        'slug' => 'the-brass-band-of-whitman-park',
        'excerpt' => 'Every Thursday, the park gets loud enough to feel like a promise.',
        'categories' => array('Dispatch', 'Small legends'),
        'tags' => array('Local', 'Music'),
        'date' => '2026-06-06 09:00:00',
    ),
    array(
        'title' => 'Where to eat right now',
        'slug' => 'where-to-eat-right-now',
        'excerpt' => 'Five modest counters, one perfect soup, and a dessert worth crossing town for.',
        'categories' => array('Dispatch', 'Guides'),
        'tags' => array('Local', 'Food'),
        'date' => '2026-06-02 09:00:00',
    ),
);

foreach ($stories as $story) {
    $post_id = wp_insert_post(array(
        'post_title' => $story['title'],
        'post_name' => $story['slug'],
        'post_excerpt' => $story['excerpt'],
        'post_content' => '<p>' . $story['excerpt'] . '</p><p>This sample story exists so Blocksmith previews can show real editorial rhythm in WordPress Playground.</p>',
        'post_status' => 'publish',
        'post_type' => 'post',
        'post_date' => $story['date'],
        'post_author' => $author_id,
    ));

    if (!is_wp_error($post_id)) {
        $category_ids = array();
        foreach ($story['categories'] as $category) {
            $term = term_exists($category_slugs[$category] ?? '', 'category');
            $term_id = is_array($term) ? (int) $term['term_id'] : (int) $term;
            if ($term_id > 0) {
                $category_ids[] = $term_id;
            }
        }

        if (!empty($category_ids)) {
            wp_set_post_terms($post_id, $category_ids, 'category');
        }

        $tag_ids = array();
        foreach ($story['tags'] as $tag) {
            $term = term_exists($tag_slugs[$tag] ?? '', 'post_tag');
            $term_id = is_array($term) ? (int) $term['term_id'] : (int) $term;
            if ($term_id > 0) {
                $tag_ids[] = $term_id;
            }
        }

        if (!empty($tag_ids)) {
            wp_set_post_terms($post_id, $tag_ids, 'post_tag');
        }
    }
}

global $wp_rewrite;
$wp_rewrite->set_permalink_structure('/story/%postname%/');
update_option('permalink_structure', '/story/%postname%/');
flush_rewrite_rules(true);
wp_cache_flush();
`;
}
