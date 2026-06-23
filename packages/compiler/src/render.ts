import type { Blueprint, BlueprintSection, BlueprintTokens } from "@blocksmith/schema";
import { defaultVariantFor } from "@blocksmith/sections";
import { escapeHtml, slugify, stableJson, titleCase } from "./utils.js";

export function renderTemplatePart(slug: string): string {
  return `<!-- wp:template-part {"slug":"${slug}"} /-->\n`;
}

export function renderPatternRef(slug: string): string {
  return `<!-- wp:pattern {"slug":"${slug}"} /-->\n`;
}

export function renderPatternFile(args: {
  title: string;
  slug: string;
  categories?: string[];
  content: string;
}): string {
  const categories = args.categories?.join(", ") ?? "featured";
  return `<?php
/**
 * Title: ${args.title}
 * Slug: ${args.slug}
 * Categories: ${categories}
 */
?>
${args.content}`;
}

export function renderSection(section: BlueprintSection, blueprint: Blueprint, context: "template" | "part" | "pattern"): string {
  const profile = blueprint.tasteProfile ?? "editorial-clean";
  const variant = section.variant ?? defaultVariantFor(section.kind, profile);

  switch (section.kind) {
    case "header":
      return group(
        [
          `<div class="blocksmith-site-brand">${block("site-title", { level: 0 })}</div>`,
          `<div class="blocksmith-site-nav">${block("navigation", { overlayMenu: "mobile" })}</div>`
        ].join("\n"),
        { align: "full", className: "blocksmith-header", layout: { type: "flex", justifyContent: "space-between", flexWrap: "wrap" } }
      );
    case "footer":
      return group(
        [
          `<div>${block("site-title", { level: 0 })}</div>`,
          `<div>${paragraph(section.text ?? "Built with WordPress.", { align: "right" })}</div>`
        ].join("\n"),
        { align: "full", className: "blocksmith-footer", layout: { type: "flex", justifyContent: "space-between", flexWrap: "wrap" } }
      );
    case "hero":
      return hero(section, variant);
    case "intro":
      return group(
        [heading(section.title ?? "A clear point of view", 2, "center"), paragraph(section.text ?? "Use this section to set the frame with calm, readable copy.", { align: "center" })].join("\n"),
        { className: "blocksmith-intro", layout: { type: "constrained", contentSize: "760px" } }
      );
    case "featureGrid":
      return featureGrid(section);
    case "mediaText":
      return mediaText(section);
    case "ctaBand":
      return group(
        [
          heading(section.title ?? "Ready for the next step?", 2, "center"),
          paragraph(section.text ?? "Keep the call to action direct, useful, and visually restrained.", { align: "center" }),
          buttons(section.cta)
        ].join("\n"),
        { align: "wide", className: "blocksmith-cta", layout: { type: "constrained" } }
      );
    case "postGrid":
      return postGrid(section);
    case "archiveHeader":
      return group([block("query-title", { type: "archive" }), block("term-description")].join("\n"), { className: "blocksmith-archive-header" });
    case "postHeader":
      return group([block("post-title", { level: 1 }), block("post-date", { isLink: true })].join("\n"), { className: "blocksmith-post-header", layout: { type: "constrained" } });
    case "featuredImage":
      return block("post-featured-image", { align: "wide" });
    case "postContent":
      return block("post-content", { layout: { type: "constrained" } });
    case "comments":
      return block("comments");
    case "pagination":
      return block("query-pagination", { layout: { type: "flex", justifyContent: "space-between" } }, `<div class="wp-block-query-pagination">${[block("query-pagination-previous"), block("query-pagination-numbers"), block("query-pagination-next")].join("\n")}</div>`);
    case "searchResults":
      return postGrid({ ...section, kind: "postGrid", title: section.title ?? "Search results" });
    case "notFound":
      return group(
        [heading(section.title ?? "Nothing found", 1, "center"), paragraph(section.text ?? "Try searching for something else.", { align: "center" }), block("search", { label: "Search", showLabel: false, buttonText: "Search" })].join("\n"),
        { className: "blocksmith-not-found", layout: { type: "constrained" } }
      );
    case "part":
      if (context === "pattern") {
        return "";
      }
      return renderTemplatePart(section.ref ?? "header");
    default:
      return paragraph(`Unsupported section: ${escapeHtml(section.kind)}`);
  }
}

export function renderThemeJson(blueprint: Blueprint) {
  const tokens = blueprint.tokens;
  const colorPalette = Object.entries(tokens.color)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([slug, color]) => ({
      color,
      name: titleCase(slug),
      slug
    }));

  return stableJson({
    $schema: "https://schemas.wp.org/wp/6.6/theme.json",
    version: 3,
    settings: {
      appearanceTools: true,
      color: {
        custom: false,
        defaultPalette: false,
        palette: colorPalette
      },
      layout: {
        contentSize: tokens.layout.contentSize,
        wideSize: tokens.layout.wideSize
      },
      spacing: {
        spacingScale: { steps: 0 },
        spacingSizes: spacingSizes(tokens)
      },
      typography: {
        customFontSize: false,
        fontFamilies: [
          {
            fontFamily: tokens.typography.bodyFont,
            name: "Body",
            slug: "body"
          },
          {
            fontFamily: tokens.typography.headingFont,
            name: "Heading",
            slug: "heading"
          }
        ],
        fontSizes: fontSizes(tokens)
      },
      custom: {
        blocksmith: {
          tasteProfile: blueprint.tasteProfile ?? "editorial-clean"
        }
      }
    },
    styles: {
      color: {
        background: "var:preset|color|base",
        text: "var:preset|color|contrast"
      },
      elements: {
        button: {
          color: {
            background: "var:preset|color|buttonBg",
            text: "var:preset|color|buttonText"
          },
          typography: {
            fontWeight: "700"
          }
        },
        heading: {
          typography: {
            fontFamily: "var:preset|font-family|heading",
            lineHeight: "1.08"
          }
        },
        link: {
          color: {
            text: "var:preset|color|link"
          }
        }
      },
      spacing: {
        blockGap: "var:preset|spacing|md"
      },
      typography: {
        fontFamily: "var:preset|font-family|body",
        fontSize: "var:preset|font-size|base",
        lineHeight: "1.62"
      }
    },
    templateParts: [
      { area: "header", name: "header", title: "Header" },
      { area: "footer", name: "footer", title: "Footer" }
    ]
  });
}

export function renderStyleVariation(title: string, blueprint: Blueprint, tokenOverrides: Partial<BlueprintTokens> = {}) {
  const merged: Blueprint = {
    ...blueprint,
    tokens: {
      ...blueprint.tokens,
      ...tokenOverrides,
      color: { ...blueprint.tokens.color, ...tokenOverrides.color },
      typography: { ...blueprint.tokens.typography, ...tokenOverrides.typography },
      spacing: { ...blueprint.tokens.spacing, ...tokenOverrides.spacing },
      layout: { ...blueprint.tokens.layout, ...tokenOverrides.layout }
    }
  };
  const parsed = JSON.parse(renderThemeJson(merged));
  return stableJson({ title, version: 3, settings: parsed.settings, styles: parsed.styles });
}

function hero(section: BlueprintSection, variant?: string): string {
  const title = section.title ?? "A WordPress theme with a point of view";
  const text = section.text ?? "A focused opening section with enough contrast, rhythm, and restraint to carry the page.";
  const inner = [
    section.eyebrow ? paragraph(section.eyebrow, { className: "blocksmith-eyebrow" }) : "",
    heading(title, 1),
    paragraph(text),
    section.cta ? buttons(section.cta) : ""
  ].filter(Boolean).join("\n");

  if (variant === "split-media") {
    return block(
      "media-text",
      { align: "wide", mediaPosition: "right", mediaType: "image", verticalAlignment: "center" },
      `<div class="wp-block-media-text alignwide is-stacked-on-mobile is-vertically-aligned-center has-media-on-the-right">
${[
        `<figure class="wp-block-media-text__media"></figure>`,
        `<div class="wp-block-media-text__content">${inner}</div>`
      ].join("\n")}
</div>`
    );
  }

  return group(inner, { align: "wide", className: "blocksmith-hero", layout: { type: "constrained", contentSize: "860px" } });
}

function featureGrid(section: BlueprintSection): string {
  const items = section.items?.length ? section.items : [
    { title: "Clear structure", text: "A disciplined layout system keeps sections readable." },
    { title: "Tasteful defaults", text: "Profiles guide hierarchy, density, and contrast." },
    { title: "WordPress native", text: "Generated output stays editable in normal block themes." }
  ];

  const columns = items.slice(0, 3).map((item) =>
    column(group([heading(item.title, 3), paragraph(item.text ?? "")].join("\n"), { className: "blocksmith-card" }))
  );

  return group(
    [
      section.title ? heading(section.title, 2, "center") : "",
      columnsBlock(columns.join("\n"), "wide")
    ].filter(Boolean).join("\n"),
    { className: "blocksmith-feature-grid" }
  );
}

function mediaText(section: BlueprintSection): string {
  return block(
    "media-text",
    { align: "wide", mediaPosition: "left", mediaType: "image", verticalAlignment: "center" },
    `<div class="wp-block-media-text alignwide is-stacked-on-mobile is-vertically-aligned-center">
${[
      `<figure class="wp-block-media-text__media"></figure>`,
      `<div class="wp-block-media-text__content">${heading(section.title ?? "Designed for real publishing", 2)}${paragraph(section.text ?? "A balanced media section gives the page a change in pace without overwhelming the content.")}${section.cta ? buttons(section.cta) : ""}</div>`
    ].join("\n")}
</div>`
  );
}

function postGrid(section: BlueprintSection): string {
  const perPage = section.query?.perPage ?? 6;
  const query = {
    perPage,
    pages: 0,
    offset: 0,
    postType: section.query?.postType ?? "post",
    order: section.query?.order ?? "desc",
    orderBy: section.query?.orderBy ?? "date",
    author: "",
    search: "",
    exclude: [],
    sticky: "",
    inherit: false
  };

  return block(
    "query",
    { query, displayLayout: { type: "flex", columns: Math.min(3, perPage) } },
    [
      section.title ? heading(section.title, 2) : "",
      block(
        "post-template",
        {},
        group([block("post-title", { isLink: true, level: 3 }), block("post-excerpt", { moreText: "Read more" }), block("post-date", { isLink: true })].join("\n"), { className: "blocksmith-post-card" })
      ),
      block("query-pagination", { layout: { type: "flex", justifyContent: "space-between" } }, [block("query-pagination-previous"), block("query-pagination-numbers"), block("query-pagination-next")].join("\n"))
    ].filter(Boolean).join("\n")
  );
}

function spacingSizes(tokens: BlueprintTokens) {
  return Object.entries(tokens.spacing).map(([slug, size]) => ({
    name: titleCase(slug),
    size,
    slug
  }));
}

function fontSizes(tokens: BlueprintTokens) {
  const scale = tokens.typography.scale ?? {};
  return [
    { slug: "small", name: "Small", size: scale.small ?? "0.875rem" },
    { slug: "base", name: "Base", size: scale.base ?? "1rem" },
    { slug: "medium", name: "Medium", size: scale.medium ?? "1.25rem" },
    { slug: "large", name: "Large", size: scale.large ?? "2rem" },
    { slug: "x-large", name: "Extra Large", size: scale.xlarge ?? "3rem" },
    { slug: "huge", name: "Huge", size: scale.huge ?? "4rem" }
  ];
}

function paragraph(text: string, attrs: Record<string, unknown> = {}): string {
  const className = typeof attrs.className === "string" ? ` class="${escapeHtml(attrs.className)}"` : "";
  return block("paragraph", attrs, `<p${className}>${escapeHtml(text)}</p>`);
}

function heading(text: string, level: number, align?: "center" | "right" | "left"): string {
  const attrs = { level, ...(align ? { textAlign: align } : {}) };
  return block("heading", attrs, `<h${level}>${escapeHtml(text)}</h${level}>`);
}

function buttons(cta?: { label: string; url: string }): string {
  if (!cta) {
    return "";
  }

  return block(
    "buttons",
    {},
    `<div class="wp-block-buttons">${block("button", {}, `<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="${escapeHtml(cta.url)}">${escapeHtml(cta.label)}</a></div>`)}</div>`
  );
}

function group(inner: string, attrs: Record<string, unknown> = {}): string {
  return block("group", attrs, `<div class="${blockClasses("wp-block-group", attrs)}">\n${inner}\n</div>`);
}

function column(inner: string): string {
  return block("column", {}, `<div class="wp-block-column">\n${inner}\n</div>`);
}

function columnsBlock(inner: string, align?: "wide" | "full"): string {
  const attrs = align ? { align } : {};
  const alignClass = align ? ` align${align}` : "";
  return block("columns", attrs, `<div class="wp-block-columns${alignClass}">\n${inner}\n</div>`);
}

function blockClasses(base: string, attrs: Record<string, unknown>): string {
  const classes = [base];
  if (attrs.align === "wide" || attrs.align === "full") {
    classes.push(`align${attrs.align}`);
  }
  if (typeof attrs.className === "string") {
    classes.push(attrs.className);
  }
  return classes.map(escapeHtml).join(" ");
}

function block(name: string, attrs: Record<string, unknown> = {}, inner?: string): string {
  const attrsText = Object.keys(attrs).length ? ` ${JSON.stringify(attrs)}` : "";
  if (!inner) {
    return `<!-- wp:${name}${attrsText} /-->`;
  }

  return `<!-- wp:${name}${attrsText} -->\n${inner}\n<!-- /wp:${name} -->`;
}
