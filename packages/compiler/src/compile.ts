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
  files["functions.php"] = renderFunctionsPhp(themeSlug);
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
        content: renderSection(section, blueprint, "pattern")
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
  const base: Record<string, BlueprintTemplate> = {
    index: {
      title: "Index",
      sections: [
        { kind: "part", ref: "header" },
        { kind: "hero", title: blueprint.metadata.name, text: blueprint.metadata.description ?? "A focused WordPress block theme." },
        { kind: "postGrid", title: "Latest posts", query: { perPage: 6 } },
        { kind: "part", ref: "footer" }
      ]
    },
    single: {
      title: "Single",
      sections: [
        { kind: "part", ref: "header" },
        { kind: "postHeader" },
        { kind: "featuredImage" },
        { kind: "postContent" },
        { kind: "comments" },
        { kind: "part", ref: "footer" }
      ]
    },
    archive: {
      title: "Archive",
      sections: [
        { kind: "part", ref: "header" },
        { kind: "archiveHeader" },
        { kind: "postGrid", query: { perPage: 9 } },
        { kind: "part", ref: "footer" }
      ]
    },
    page: {
      title: "Page",
      sections: [
        { kind: "part", ref: "header" },
        { kind: "postHeader" },
        { kind: "postContent" },
        { kind: "part", ref: "footer" }
      ]
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

function renderFunctionsPhp(themeSlug: string): string {
  const handle = `${themeSlug}-blocksmith`;
  return `<?php
/**
 * Theme setup for generated Blocksmith styles.
 */

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
  return `body {
  background:
    linear-gradient(90deg, rgba(182, 63, 45, 0.06) 0 1px, transparent 1px 100%),
    var(--wp--preset--color--base, ${tokens.color.base});
  background-size: 88px 88px;
}

.wp-site-blocks {
  padding-left: clamp(1rem, 4vw, 4rem);
  padding-right: clamp(1rem, 4vw, 4rem);
}

.blocksmith-header,
.blocksmith-footer {
  align-items: center;
  border-bottom: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  display: flex;
  justify-content: space-between;
  padding-top: var(--wp--preset--spacing--md);
  padding-bottom: var(--wp--preset--spacing--md);
}

.blocksmith-hero {
  background: var(--wp--preset--color--muted, ${tokens.color.muted ?? "#f4f4f4"});
  border: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  border-radius: ${tokens.radius?.lg ?? "8px"};
  box-shadow: ${tokens.shadow?.sm ?? "0 18px 50px rgba(0, 0, 0, 0.06)"};
  margin-top: var(--wp--preset--spacing--lg);
  margin-bottom: var(--wp--preset--spacing--lg);
  max-width: var(--wp--style--global--wide-size, ${tokens.layout.wideSize});
  padding-top: var(--wp--preset--spacing--xxl, 6rem);
  padding-bottom: var(--wp--preset--spacing--xxl, 6rem);
  padding-left: clamp(1.5rem, 5vw, 5rem);
  padding-right: clamp(1.5rem, 5vw, 5rem);
}

.blocksmith-hero h1 {
  font-size: clamp(3rem, 7vw, 6.5rem);
  letter-spacing: 0;
  max-width: 11ch;
}

.blocksmith-hero p:not(.blocksmith-eyebrow) {
  font-size: clamp(1.125rem, 2vw, 1.5rem);
  max-width: 46rem;
}

.blocksmith-intro {
  margin-left: auto;
  margin-right: auto;
  max-width: 780px;
  padding-bottom: var(--wp--preset--spacing--lg);
  padding-top: var(--wp--preset--spacing--lg);
}

.blocksmith-feature-grid {
  margin-left: auto;
  margin-right: auto;
  max-width: var(--wp--style--global--wide-size, ${tokens.layout.wideSize});
  padding-bottom: var(--wp--preset--spacing--lg);
  padding-top: var(--wp--preset--spacing--lg);
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
  border-radius: ${tokens.radius?.md ?? "6px"};
  min-height: 100%;
  padding: var(--wp--preset--spacing--md);
}

.blocksmith-card h3 {
  margin-top: 0;
}

.blocksmith-eyebrow {
  font-size: var(--wp--preset--font-size--small);
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.blocksmith-cta {
  background: var(--wp--preset--color--surface-alt, ${tokens.color.surfaceAlt ?? "#f7f7f7"});
  border-top: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  border-bottom: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  margin-bottom: var(--wp--preset--spacing--lg);
  margin-top: var(--wp--preset--spacing--lg);
  padding-top: var(--wp--preset--spacing--xl, 4rem);
  padding-bottom: var(--wp--preset--spacing--xl, 4rem);
  text-align: center;
}

.wp-block-button__link,
.wp-element-button {
  background: var(--wp--preset--color--button-bg, ${tokens.color.buttonBg ?? tokens.color.primary});
  border-radius: ${tokens.radius?.sm ?? "999px"};
  color: var(--wp--preset--color--button-text, ${tokens.color.buttonText ?? "#ffffff"});
  display: inline-block;
  font-weight: 800;
  padding: 0.85rem 1.25rem;
  text-decoration: none;
}

.wp-block-query {
  margin-left: auto;
  margin-right: auto;
  max-width: var(--wp--style--global--wide-size, ${tokens.layout.wideSize});
}

.wp-block-post-template {
  display: grid;
  gap: var(--wp--preset--spacing--md);
  grid-template-columns: repeat(3, minmax(0, 1fr));
  list-style: none;
  padding-left: 0;
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

@media (max-width: 760px) {
  .blocksmith-feature-grid .wp-block-columns,
  .wp-block-post-template {
    grid-template-columns: 1fr;
  }

  .blocksmith-header,
  .blocksmith-footer {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.75rem;
  }
}
`;
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
      }
    ]
  });
}
