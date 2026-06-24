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

export function renderSection(section: BlueprintSection, blueprint: Blueprint, context: "template" | "part" | "pattern", options: { template?: string; sectionIndex?: number } = {}): string {
  const profile = blueprint.tasteProfile ?? "editorial-clean";
  const variant = section.variant ?? defaultVariantFor(section.kind, profile);

  switch (section.kind) {
    case "header": {
      const wordmarkBase = blueprint.metadata.name.replace(/\s+Dispatch$/i, "");
      return group(
        [
          `<div class="blocksmith-header-top blocksmith-topbar"><span>Tuesday, June 23, 2026</span><span>About&nbsp;&nbsp; Newsletter&nbsp;&nbsp; Advertise&nbsp;&nbsp; Support</span></div>`,
          `<div class="blocksmith-masthead-row">
  <p class="blocksmith-masthead-note">Local stories.<br>Lasting impressions.<br>Regionally famous.</p>
  <a class="blocksmith-wordmark" href="/"><span>${escapeHtml(wordmarkBase)}</span><strong>Dispatch</strong><em>Neighborhood stories. Cultural notes. Local legends.</em></a>
  <div class="blocksmith-site-brand-native">${block("site-title", { level: 0 })}</div>
  <div class="blocksmith-masthead-ornament"><div class="blocksmith-header-bird" aria-hidden="true"></div><p>A modern<br>publication<br>rooted here.</p></div>
</div>`,
          `<div class="blocksmith-nav-row"><div class="blocksmith-site-nav">${navigation()}</div><div class="blocksmith-site-search">${block("search", { label: "Search", showLabel: false, buttonText: "Search", buttonPosition: "button-only" })}</div></div>`
        ].join("\n"),
        { align: "full", className: "blocksmith-header" }
      );
    }
    case "footer":
      return group(
        [
          `<div class="blocksmith-footer-grid">
  <div class="blocksmith-footer-about">${block("site-title", { level: 0 })}${paragraph(section.text ?? "Independent local publishing with uncommon polish.")}${link("Our story ->", "/about/")}</div>
  <div><p class="blocksmith-footer-label">Explore</p>${link("Dispatches", "/category/dispatch/")}${link("Place notes", "/category/place-notes/")}${link("People features", "/category/people-features/")}${link("Small legends", "/category/small-legends/")}</div>
  <div><p class="blocksmith-footer-label">Info</p>${link("About", "/about/")}${link("Support us", "/support-us/")}${link("Advertise", "/advertise/")}${link("Contact", "/contact/")}</div>
  <div class="blocksmith-footer-card"><p class="blocksmith-footer-label">Reader supported</p><p>Local stories stay stronger when neighbors keep them going.</p>${link("Support the dispatch ->", "/support-us/")}</div>
</div>`,
          `<div class="blocksmith-footer-bottom"><span>Built with WordPress.</span><span>Site by neighbors, not algorithms.</span></div>`
        ].join("\n"),
        { align: "full", className: "blocksmith-footer" }
      );
    case "hero":
      return hero(section, variant);
    case "intro":
      if (variant === "editor-note") {
        return editorNote(section);
      }
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
          `<div class="blocksmith-cta-icon blocksmith-newsletter-art" aria-hidden="true"></div>`,
          `<div class="blocksmith-cta-copy">${heading(section.title ?? "Good stories in your inbox.", 2)}${paragraph(section.text ?? "A weekly dispatch of local stories and behind-the-scenes notes.")}</div>`,
          `<div class="blocksmith-cta-action">${buttons(section.cta)}</div>`
        ].join("\n"),
        { align: "full", className: "blocksmith-cta" }
      );
    case "postGrid":
      return postGrid(section, { inheritQuery: isInheritedQueryTemplate(options.template), queryId: queryIdFor(options), template: options.template });
    case "archiveHeader":
      return archiveHeader(options.template);
    case "postHeader":
      return postHeader(options.template);
    case "featuredImage":
      return featuredImage(options.template);
    case "postContent":
      return postContent(options.template);
    case "comments":
      return block("comments");
    case "pagination":
      return block("query-pagination", { layout: { type: "flex", justifyContent: "space-between" } }, `<div class="wp-block-query-pagination">${[block("query-pagination-previous"), block("query-pagination-numbers"), block("query-pagination-next")].join("\n")}</div>`);
    case "searchResults":
      return postGrid({ ...section, kind: "postGrid" }, { inheritQuery: true, queryId: queryIdFor(options), template: options.template });
    case "notFound":
      return notFoundSection(section);
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
  const bodyFontFaces = fontFacesForStack(blueprint, tokens.typography.bodyFont);
  const headingFontFaces = fontFacesForStack(blueprint, tokens.typography.headingFont);
  const colorPalette = Object.entries(tokens.color)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([slug, color]) => ({
      color,
      name: titleCase(slug),
      slug
    }));

  return stableJson({
    $schema: "https://schemas.wp.org/wp/6.6/theme.json",
    customTemplates: [
      {
        name: "page-wide",
        postTypes: ["page"],
        title: "Wide Page"
      }
    ],
    version: 3,
    settings: {
      appearanceTools: true,
      useRootPaddingAwareAlignments: true,
      border: {
        color: true,
        radius: true,
        style: true,
        width: true
      },
      color: {
        custom: false,
        customDuotone: false,
        customGradient: false,
        defaultDuotone: false,
        defaultGradients: false,
        defaultPalette: false,
        gradients: gradients(tokens),
        palette: colorPalette
      },
      dimensions: {
        aspectRatio: true,
        minHeight: true
      },
      layout: {
        contentSize: tokens.layout.contentSize,
        wideSize: tokens.layout.wideSize
      },
      lightbox: {
        allowEditing: true,
        enabled: false
      },
      position: {
        sticky: true
      },
      shadow: {
        defaultPresets: false,
        presets: shadowPresets(tokens)
      },
      spacing: {
        blockGap: true,
        margin: true,
        padding: true,
        spacingScale: { steps: 0 },
        spacingSizes: spacingSizes(tokens),
        units: ["px", "rem", "em", "%", "vh", "vw"]
      },
      typography: {
        customFontSize: false,
        defaultFontSizes: false,
        dropCap: true,
        fluid: true,
        fontFamilies: [
          {
            fontFamily: tokens.typography.bodyFont,
            ...(bodyFontFaces.length ? { fontFace: bodyFontFaces } : {}),
            name: "Body",
            slug: "body"
          },
          {
            fontFamily: tokens.typography.headingFont,
            ...(headingFontFaces.length ? { fontFace: headingFontFaces } : {}),
            name: "Heading",
            slug: "heading"
          }
        ],
        fontSizes: fontSizes(tokens),
        fontStyle: true,
        fontWeight: true,
        letterSpacing: true,
        lineHeight: true,
        textDecoration: true,
        textTransform: true
      },
      blocks: {
        "core/button": {
          border: {
            radius: true
          },
          spacing: {
            padding: true
          },
          typography: {
            fontWeight: true,
            textTransform: true
          }
        },
        "core/group": {
          spacing: {
            blockGap: true,
            margin: true,
            padding: true
          }
        },
        "core/navigation": {
          typography: {
            fontSize: true,
            fontWeight: true,
            textTransform: true
          }
        },
        "core/post-template": {
          spacing: {
            blockGap: true
          }
        },
        "core/query": {
          spacing: {
            margin: true,
            padding: true
          }
        },
        "core/search": {
          border: {
            color: true,
            radius: true,
            width: true
          },
          spacing: {
            margin: true
          }
        }
      },
      custom: {
        blocksmith: {
          templateCoverage: "full-v1",
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
        blockGap: "var:preset|spacing|md",
        padding: {
          bottom: "0",
          left: "clamp(1rem, 3vw, 2rem)",
          right: "clamp(1rem, 3vw, 2rem)",
          top: "0"
        }
      },
      typography: {
        fontFamily: "var:preset|font-family|body",
        fontSize: "var:preset|font-size|base",
        lineHeight: "1.62"
      },
      blocks: {
        "core/button": {
          border: {
            radius: tokens.radius?.sm ?? "2px"
          },
          typography: {
            fontWeight: "800",
            textTransform: "uppercase"
          }
        },
        "core/navigation": {
          typography: {
            fontFamily: "var:preset|font-family|body",
            fontSize: "var:preset|font-size|small",
            fontWeight: "700"
          }
        },
        "core/post-date": {
          typography: {
            fontSize: "var:preset|font-size|small"
          }
        },
        "core/post-excerpt": {
          typography: {
            fontSize: "var:preset|font-size|base",
            lineHeight: "1.55"
          }
        },
        "core/post-title": {
          typography: {
            fontFamily: "var:preset|font-family|heading",
            lineHeight: "1.12"
          }
        },
        "core/query": {
          spacing: {
            blockGap: "var:preset|spacing|md"
          }
        },
        "core/search": {
          border: {
            color: "var:preset|color|contrast",
            radius: tokens.radius?.sm ?? "2px",
            width: "1px"
          }
        }
      }
    },
    templateParts: [
      { area: "header", name: "header", title: "Header" },
      { area: "footer", name: "footer", title: "Footer" }
    ]
  });
}

function fontFacesForStack(blueprint: Blueprint, fontStack: string) {
  const fontAssets = blueprint.assets ?? [];
  const family = fontAssets
    .filter((asset) => asset.role === "font" && asset.fontFamily)
    .find((asset) => fontStack.includes(asset.fontFamily ?? ""))?.fontFamily;

  if (!family) {
    return [];
  }

  return fontAssets
    .filter((asset) => asset.role === "font" && asset.fontFamily === family)
    .map((asset) => ({
      fontFamily: family,
      fontStyle: asset.fontStyle ?? "normal",
      fontWeight: asset.fontWeight ?? "400",
      src: [`file:./${asset.path}`]
    }));
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

  return group(
    `<div class="blocksmith-hero-grid">
  <div class="blocksmith-hero-copy">${inner}</div>
  <div class="blocksmith-hero-art" aria-hidden="true"><span>Field guide</span></div>
</div>`,
    { align: "wide", className: "blocksmith-hero" }
  ) + group(
    `<div class="blocksmith-home-collage">
  <div class="blocksmith-collage-map" aria-hidden="true"></div>
  <div class="blocksmith-collage-quote"><span aria-hidden="true">~</span><p>We report what makes a place itself.<br>Not trends. Not takes. Just truth, told well.</p><strong>RFD</strong></div>
  <div class="blocksmith-collage-sketch" aria-hidden="true"></div>
</div>`,
    { align: "wide", className: "blocksmith-home-collage-wrap" }
  );
}

function editorNote(section: BlueprintSection): string {
  return group(
    [
      `<div class="blocksmith-note-mark" aria-hidden="true"></div>`,
      `<div class="blocksmith-note-quote"><p class="blocksmith-mini-label">A note from the editor</p>${heading(section.title ?? "Editor's note", 2)}${paragraph(section.text ?? "A short editorial beat gives the page a humane pause before the final call to action.")}${section.cta ? link(section.cta.label + " ->", section.cta.url, "blocksmith-inline-action") : ""}</div>`,
      `<div class="blocksmith-note-aside" aria-hidden="true"><span>RFD</span></div>`
    ].join("\n"),
    { align: "full", className: "blocksmith-editor-note" }
  );
}

function featureGrid(section: BlueprintSection): string {
  const items = section.items?.length ? section.items : [
    { title: "Clear structure", text: "A disciplined layout system keeps sections readable." },
    { title: "Tasteful defaults", text: "Profiles guide hierarchy, density, and contrast." },
    { title: "WordPress native", text: "Generated output stays editable in normal block themes." }
  ];

  const kickers = ["Place notes", "People features", "Small legends"];
  const links = ["Explore places ->", "Meet the people ->", "Read the legends ->"];
  const urls = ["/category/place-notes/", "/category/people-features/", "/category/small-legends/"];
  const columns = items.slice(0, 3).map((item, index) =>
    column(
      group(
        [
          `<span class="blocksmith-card-kicker">${escapeHtml(kickers[index] ?? "Feature")}</span>`,
          heading(item.title, 3),
          paragraph(item.text ?? ""),
          link(links[index] ?? "Read more ->", urls[index] ?? "/", "blocksmith-card-link")
        ].join("\n"),
        { className: `blocksmith-card blocksmith-card-${index + 1}` }
      )
    )
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

function archiveHeader(template?: string): string {
  const type = template === "search" ? "search" : "archive";
  const eyebrow = type === "search" ? "Search" : "Archive";
  const children = [
    `<p class="blocksmith-template-kicker">${eyebrow}</p>`,
    block("query-title", { type })
  ];

  if (type === "archive") {
    children.push(block("term-description"));
  }

  children.push(
    `<div class="blocksmith-archive-sidecar">
  <div class="blocksmith-archive-art" aria-hidden="true"></div>
  <div class="blocksmith-archive-tools">
  <div class="blocksmith-archive-search">${block("search", { label: "Search the archive", showLabel: false, placeholder: "Search dispatches...", buttonText: "Search" })}</div>
  <div class="blocksmith-topic-links">${topicLinks()}</div>
</div>
</div>`
  );

  return group(children.join("\n"), { className: "blocksmith-archive-header" });
}

const inheritedQueryTemplates = new Set([
  "home",
  "archive",
  "taxonomy",
  "category",
  "tag",
  "author",
  "date",
  "search"
]);

function isInheritedQueryTemplate(template?: string): boolean {
  return template ? inheritedQueryTemplates.has(template) : false;
}

function queryIdFor(options: { template?: string; sectionIndex?: number }): number {
  const seed = Array.from(options.template ?? "query").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return seed + (options.sectionIndex ?? 0) + 1;
}

function postHeader(template?: string): string {
  const isPage = template === "page" || template === "privacy-policy" || template === "page-wide";
  const meta = isPage
    ? `<div class="blocksmith-breadcrumbs">${link("Home", "/")}<span>/</span><span>Page</span></div>`
    : `<div class="blocksmith-breadcrumbs">${link("Home", "/")}<span>/</span>${link("Dispatches", "/category/dispatch/")}</div>
<div class="blocksmith-post-meta-list">
  ${block("post-terms", { term: "category", separator: " / " })}
  ${block("post-date", { isLink: true })}
  ${block("post-author-name", { isLink: true })}
</div>
<div class="blocksmith-post-share"><span>Share</span>${link("Email", "mailto:?subject=Regionally%20Famous%20Dispatch")}${link("Submit a tip", "/contact/")}</div>`;

  const titleStack = [
    block("post-title", { level: 1 }),
    isPage ? "" : block("post-excerpt", { showMoreOnNewLine: false, excerptLength: 24 })
  ].filter(Boolean).join("\n");

  return group(
    [
      `<aside class="blocksmith-post-meta-rail">${meta}</aside>`,
      `<div class="blocksmith-post-title-stack">${titleStack}</div>`
    ].join("\n"),
    { className: `blocksmith-post-header${isPage ? " blocksmith-page-header" : ""}`, layout: { type: "constrained" } }
  );
}

function postContent(template?: string): string {
  const content = block("post-content", { className: "blocksmith-post-content", layout: { type: "constrained" } });

  if (isSingularTemplate(template)) {
    return group(
      `<div class="blocksmith-article-main">${content}</div>
<aside class="blocksmith-article-sidebar">
  <div class="blocksmith-author-card"><div class="blocksmith-author-portrait" aria-hidden="true"></div><p class="blocksmith-mini-label">About the author</p><h2>Elena Marquez</h2><p>Writer, coffee drinker, and neighborhood explorer. Elena covers the everyday stories that make this place home.</p>${link("More stories by Elena ->", "/category/people-features/")}</div>
  <div class="blocksmith-story-card"><p class="blocksmith-mini-label">On this story</p><p>Published locally. Updated as the neighborhood changes.</p><p>Terms: markets, community, local food.</p></div>
</aside>`,
      { className: "blocksmith-article-layout" }
    );
  }

  if (template === "page" || template === "privacy-policy" || template === "page-wide") {
    return group(
      `<div class="blocksmith-page-main">${content}</div>
<aside class="blocksmith-page-sidebar">
  <div class="blocksmith-author-card"><p class="blocksmith-mini-label">Editor's note</p><h2>Why local journalism matters</h2><p>From civic meetings to corner stores, local reporting connects us to the decisions and discoveries shaping daily life.</p>${link("Read more from Mara ->", "/about/")}</div>
  <div class="blocksmith-story-card"><p class="blocksmith-mini-label">Stay in the know</p><p>Get our best stories in your inbox.</p>${link("Sign me up ->", "/subscribe/")}</div>
</aside>`,
      { className: "blocksmith-page-layout" }
    );
  }

  return content;
}

function featuredImage(template?: string): string {
  const image = block("post-featured-image", { className: "blocksmith-featured-image" });

  if (!isSingularTemplate(template)) {
    return block("post-featured-image", { align: "wide", className: "blocksmith-featured-image" });
  }

  return group(
    `<div class="blocksmith-featured-image-rail" aria-hidden="true"></div>
<div class="blocksmith-featured-image-frame">${image}</div>`,
    { className: "blocksmith-featured-image-row" }
  );
}

function notFoundSection(section: BlueprintSection): string {
  return group(
    [
      `<p class="blocksmith-template-kicker">404</p>`,
      heading(section.title ?? "Nothing found.", 1, "center"),
      paragraph(section.text ?? "We looked high and low, but couldn't find that page. Let's get you back on track.", { align: "center" }),
      `<div class="blocksmith-not-found-art" aria-hidden="true"></div>`,
      `<div class="blocksmith-recovery-panel">
  ${heading("Search the archive", 2)}
  ${block("search", { label: "Search", showLabel: false, placeholder: "Search stories, topics, people...", buttonText: "Search" })}
</div>`,
      `<div class="blocksmith-topic-links blocksmith-topic-links-large">${topicLinks()}</div>`
    ].join("\n"),
    { className: "blocksmith-not-found", layout: { type: "constrained" } }
  );
}

function postGrid(section: BlueprintSection, options: { inheritQuery?: boolean; queryId?: number; template?: string } = {}): string {
  const perPage = section.query?.perPage ?? 6;
  const family = queryFamily(options.template);
  const isSingularRelated = isSingularTemplate(options.template);
  const queryColumns = family === "archive" ? 3 : family === "related" ? 4 : Math.min(4, perPage);
  const queryHeading = section.title
    ? sectionHeading(section)
    : family === "archive"
      ? sectionHeading({ ...section, title: options.template === "search" ? "Search results" : "Latest in this section" })
      : "";
  const query = options.inheritQuery
    ? {
        inherit: true
      }
    : {
        perPage,
        pages: 0,
        offset: isSingularRelated ? 1 : 0,
        postType: section.query?.postType ?? "post",
        order: section.query?.order ?? "desc",
        orderBy: section.query?.orderBy ?? "date",
        author: "",
        search: "",
        exclude: [],
        sticky: "",
        inherit: false,
        taxQuery: null,
        parents: [],
        format: []
      };

  return block(
    "query",
    { queryId: options.queryId ?? 1, query, tagName: "div", className: `blocksmith-query blocksmith-query-${family}`, enhancedPagination: true, displayLayout: { type: "flex", columns: queryColumns } },
    [
      queryHeading,
      block(
        "post-template",
        {},
        group(
          [
            block("post-featured-image", { isLink: true, className: "blocksmith-post-card-media" }),
            block("post-terms", { term: "category", separator: " / ", className: "blocksmith-post-card-terms" }),
            block("post-title", { isLink: true, level: 3 }),
            block("post-excerpt", { moreText: "Read more" }),
            block("post-date", { isLink: true })
          ].join("\n"),
          { className: `blocksmith-post-card blocksmith-post-card-${family}` }
        )
      ),
      block(
        "query-no-results",
        {},
        group(
          [
            heading("Nothing matched this query.", 2),
            paragraph("Try another search or browse the most useful sections."),
            block("search", { label: "Search again", showLabel: false, placeholder: "Search dispatches...", buttonText: "Search" }),
            `<div class="blocksmith-topic-links">${topicLinks()}</div>`
          ].join("\n"),
          { className: "blocksmith-query-empty" }
        )
      ),
      family === "related" || !options.inheritQuery ? "" : block("query-pagination", { layout: { type: "flex", justifyContent: "space-between" } }, [block("query-pagination-previous"), block("query-pagination-numbers"), block("query-pagination-next")].join("\n"))
    ].filter(Boolean).join("\n")
  );
}

function queryFamily(template?: string): "home" | "archive" | "related" {
  if (!template || template === "front-page" || template === "index") {
    return "home";
  }
  if (inheritedQueryTemplates.has(template)) {
    return "archive";
  }
  return "related";
}

function isSingularTemplate(template?: string): boolean {
  return template === "single" || template === "single-post" || template === "singular" || template === "attachment" || template === "embed";
}

function topicLinks(): string {
  return [
    link("Dispatches ->", "/category/dispatch/"),
    link("Place notes ->", "/category/place-notes/"),
    link("People ->", "/category/people-features/"),
    link("Guides ->", "/category/guides/"),
    link("Small legends ->", "/category/small-legends/")
  ].join("\n");
}

function sectionHeading(section: BlueprintSection): string {
  const cta = section.cta ? link(section.cta.label, section.cta.url) : "";
  return `<div id="latest" class="blocksmith-section-heading"><span aria-hidden="true">+</span>${heading(section.title ?? "Latest posts", 2)}${cta}</div>`;
}

function spacingSizes(tokens: BlueprintTokens) {
  return Object.entries(tokens.spacing).map(([slug, size]) => ({
    name: titleCase(slug),
    size,
    slug
  }));
}

function gradients(tokens: BlueprintTokens) {
  const secondary = tokens.color.secondary ?? tokens.color.primary;
  const surface = tokens.color.surfaceAlt ?? tokens.color.base;
  return [
    {
      gradient: `linear-gradient(135deg, ${tokens.color.primary} 0%, ${secondary} 100%)`,
      name: "Primary to Secondary",
      slug: "primary-to-secondary"
    },
    {
      gradient: `linear-gradient(135deg, ${surface} 0%, ${tokens.color.base} 100%)`,
      name: "Soft Surface",
      slug: "soft-surface"
    }
  ];
}

function shadowPresets(tokens: BlueprintTokens) {
  return [
    {
      name: "Small",
      shadow: tokens.shadow?.sm ?? "0 1px 2px rgb(0 0 0 / 0.08)",
      slug: "small"
    },
    {
      name: "Medium",
      shadow: tokens.shadow?.md ?? "0 12px 30px rgb(0 0 0 / 0.12)",
      slug: "medium"
    },
    {
      name: "Large",
      shadow: tokens.shadow?.lg ?? "0 24px 60px rgb(0 0 0 / 0.16)",
      slug: "large"
    }
  ];
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

function navigation(): string {
  return block(
    "navigation",
    { overlayMenu: "mobile" },
    [
      navigationLink("Dispatches", "/category/dispatch/"),
      navigationLink("Places", "/category/place-notes/"),
      navigationLink("People", "/category/people-features/"),
      navigationLink("Guides", "/category/guides/"),
      navigationLink("Small Legends", "/category/small-legends/"),
      navigationLink("About", "/about/")
    ].join("\n")
  );
}

function navigationLink(label: string, url: string): string {
  return block("navigation-link", { label, type: "custom", url, kind: "custom", isTopLevelLink: true });
}

function link(label: string, href: string, className?: string): string {
  const classAttr = className ? ` class="${escapeHtml(className)}"` : "";
  return `<a${classAttr} href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
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
