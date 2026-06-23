import type { SectionKind, TasteProfile } from "@blocksmith/schema";

export interface SectionVariantMetadata {
  kind: SectionKind;
  variant: string;
  idealUse: string[];
  density: "low" | "medium" | "high";
  visualWeight: "quiet" | "balanced" | "strong";
  allowedNext: SectionKind[];
  mobileBehavior: string;
  failureModes: string[];
  preferredProfiles: TasteProfile[];
}

export const sectionRegistry: SectionVariantMetadata[] = [
  {
    kind: "header",
    variant: "standard",
    idealUse: ["all"],
    density: "medium",
    visualWeight: "quiet",
    allowedNext: ["hero", "intro", "archiveHeader", "postHeader", "notFound"],
    mobileBehavior: "Navigation stacks under site title when constrained.",
    failureModes: ["Underpowered header", "Too many navigation items"],
    preferredProfiles: ["editorial-clean", "small-business-trustworthy", "nonprofit-warm"]
  },
  {
    kind: "footer",
    variant: "standard",
    idealUse: ["all"],
    density: "medium",
    visualWeight: "quiet",
    allowedNext: [],
    mobileBehavior: "Stacks site identity and copyright.",
    failureModes: ["Footer lacks useful closure"],
    preferredProfiles: ["editorial-clean", "small-business-trustworthy", "nonprofit-warm"]
  },
  {
    kind: "hero",
    variant: "editorial",
    idealUse: ["blog", "magazine", "nonprofit"],
    density: "medium",
    visualWeight: "strong",
    allowedNext: ["intro", "postGrid", "featureGrid", "mediaText", "ctaBand"],
    mobileBehavior: "Headline remains first; supporting copy wraps below.",
    failureModes: ["Weak hierarchy", "Overlong line length", "Missing CTA"],
    preferredProfiles: ["editorial-clean", "magazine-dense", "nonprofit-warm"]
  },
  {
    kind: "hero",
    variant: "split-media",
    idealUse: ["portfolio", "small-business"],
    density: "medium",
    visualWeight: "strong",
    allowedNext: ["intro", "featureGrid", "mediaText", "ctaBand"],
    mobileBehavior: "Media drops below copy with preserved CTA order.",
    failureModes: ["Media overwhelms title", "Image without alt text"],
    preferredProfiles: ["portfolio-bold", "small-business-trustworthy"]
  },
  {
    kind: "intro",
    variant: "centered",
    idealUse: ["all"],
    density: "low",
    visualWeight: "balanced",
    allowedNext: ["featureGrid", "mediaText", "postGrid", "ctaBand"],
    mobileBehavior: "Constrained measure keeps copy readable.",
    failureModes: ["Bland rhythm", "Too much body copy"],
    preferredProfiles: ["editorial-clean", "nonprofit-warm"]
  },
  {
    kind: "featureGrid",
    variant: "three-up",
    idealUse: ["portfolio", "small-business", "nonprofit"],
    density: "high",
    visualWeight: "balanced",
    allowedNext: ["mediaText", "ctaBand", "postGrid"],
    mobileBehavior: "Cards stack with consistent gaps.",
    failureModes: ["Repeated card copy", "Too many accents"],
    preferredProfiles: ["portfolio-bold", "small-business-trustworthy", "nonprofit-warm"]
  },
  {
    kind: "mediaText",
    variant: "balanced",
    idealUse: ["portfolio", "small-business", "nonprofit"],
    density: "medium",
    visualWeight: "balanced",
    allowedNext: ["featureGrid", "postGrid", "ctaBand"],
    mobileBehavior: "Media and text stack while preserving reading order.",
    failureModes: ["Image missing", "Text/media proportion feels awkward"],
    preferredProfiles: ["portfolio-bold", "small-business-trustworthy"]
  },
  {
    kind: "postGrid",
    variant: "cards",
    idealUse: ["blog", "magazine"],
    density: "high",
    visualWeight: "balanced",
    allowedNext: ["pagination", "ctaBand", "footer"],
    mobileBehavior: "Query cards collapse to one column.",
    failureModes: ["Empty query", "Cards lack rhythm", "Too many posts above fold"],
    preferredProfiles: ["editorial-clean", "magazine-dense"]
  },
  {
    kind: "ctaBand",
    variant: "quiet",
    idealUse: ["all"],
    density: "medium",
    visualWeight: "balanced",
    allowedNext: ["footer", "postGrid", "featureGrid"],
    mobileBehavior: "CTA button remains directly after copy.",
    failureModes: ["Weak CTA hierarchy", "Too much accent color"],
    preferredProfiles: ["editorial-clean", "small-business-trustworthy", "nonprofit-warm"]
  }
];

export function getSectionVariant(kind: SectionKind, variant = "standard") {
  return (
    sectionRegistry.find((entry) => entry.kind === kind && entry.variant === variant) ??
    sectionRegistry.find((entry) => entry.kind === kind)
  );
}

export function defaultVariantFor(kind: SectionKind, profile: TasteProfile): string | undefined {
  const exact = sectionRegistry.find((entry) => entry.kind === kind && entry.preferredProfiles.includes(profile));
  return exact?.variant ?? sectionRegistry.find((entry) => entry.kind === kind)?.variant;
}

