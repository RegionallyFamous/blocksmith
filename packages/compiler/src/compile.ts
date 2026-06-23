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
  files["playground/blueprint.json"] = renderPlaygroundBlueprint(themeSlug);

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

@import url("./assets/css/blocksmith.css");
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
  return `.blocksmith-header,
.blocksmith-footer {
  padding-top: var(--wp--preset--spacing--md);
  padding-bottom: var(--wp--preset--spacing--md);
}

.blocksmith-hero {
  padding-top: var(--wp--preset--spacing--xxl, 6rem);
  padding-bottom: var(--wp--preset--spacing--xxl, 6rem);
}

.blocksmith-card,
.blocksmith-post-card {
  border: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  border-radius: ${tokens.radius?.md ?? "6px"};
  padding: var(--wp--preset--spacing--md);
}

.blocksmith-eyebrow {
  font-size: var(--wp--preset--font-size--small);
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.blocksmith-cta {
  border-top: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  border-bottom: 1px solid var(--wp--preset--color--border, ${tokens.color.border ?? "#dddddd"});
  padding-top: var(--wp--preset--spacing--xl, 4rem);
  padding-bottom: var(--wp--preset--spacing--xl, 4rem);
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
`;
}

function renderPlaygroundBlueprint(themeSlug: string): string {
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
          stylesheet: themeSlug,
          template: themeSlug
        }
      }
    ]
  });
}

