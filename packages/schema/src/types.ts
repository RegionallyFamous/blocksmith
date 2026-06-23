export const API_VERSION = "blocksmith.io/v0.1";
export const BLUEPRINT_KIND = "BlockTheme";

export const tasteProfiles = [
  "editorial-clean",
  "portfolio-bold",
  "small-business-trustworthy",
  "magazine-dense",
  "nonprofit-warm"
] as const;

export type TasteProfile = (typeof tasteProfiles)[number];

export const sectionKinds = [
  "part",
  "header",
  "footer",
  "hero",
  "intro",
  "mediaText",
  "featureGrid",
  "ctaBand",
  "postGrid",
  "archiveHeader",
  "postHeader",
  "featuredImage",
  "postContent",
  "comments",
  "pagination",
  "searchResults",
  "notFound"
] as const;

export type SectionKind = (typeof sectionKinds)[number];

export interface BlueprintTarget {
  wordpress: string;
  themeJson: 3;
  php: string;
  blockProfile: "core-stable";
}

export interface BlueprintMetadata {
  name: string;
  slug?: string;
  description?: string;
  author?: string;
  version?: string;
  textDomain?: string;
  license?: string;
  requiresAtLeast?: string;
  requiresPhp?: string;
}

export interface ColorTokens {
  base: string;
  contrast: string;
  primary: string;
  secondary?: string;
  muted?: string;
  surface?: string;
  surfaceAlt?: string;
  border?: string;
  link?: string;
  buttonBg?: string;
  buttonText?: string;
  focus?: string;
  [key: string]: string | undefined;
}

export interface TypographyTokens {
  bodyFont: string;
  headingFont: string;
  scale?: {
    small?: string;
    base?: string;
    medium?: string;
    large?: string;
    xlarge?: string;
    huge?: string;
  };
}

export interface SpacingTokens {
  xs?: string;
  sm?: string;
  md: string;
  lg: string;
  xl?: string;
  xxl?: string;
}

export interface LayoutTokens {
  contentSize: string;
  wideSize: string;
}

export interface BlueprintTokens {
  color: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  layout: LayoutTokens;
  radius?: {
    sm?: string;
    md?: string;
    lg?: string;
  };
  shadow?: {
    sm?: string;
    md?: string;
    lg?: string;
  };
}

export interface BlueprintAsset {
  path: string;
  source: string;
  license: string;
  role?: "hero" | "texture" | "content" | "reference";
  author?: string;
  copyright?: string;
  generated?: boolean;
}

export interface BlueprintCta {
  label: string;
  url: string;
}

export interface BlueprintImage {
  src?: string;
  alt?: string;
}

export interface BlueprintSection {
  kind: SectionKind;
  variant?: string;
  ref?: string;
  title?: string;
  eyebrow?: string;
  text?: string;
  cta?: BlueprintCta;
  image?: BlueprintImage;
  items?: Array<{
    title: string;
    text?: string;
  }>;
  query?: {
    perPage?: number;
    order?: "asc" | "desc";
    orderBy?: "date" | "title" | "menu_order";
    postType?: "post" | "page";
  };
}

export interface BlueprintTemplate {
  title?: string;
  sections: BlueprintSection[];
}

export interface BlueprintStyleVariation {
  title: string;
  slug?: string;
  tasteProfile?: TasteProfile;
  tokens?: Partial<BlueprintTokens>;
}

export interface BlueprintPolicy {
  profile: "wporg-block-theme-v1";
  allowRawCode?: false;
  allowRemoteAssets?: false;
}

export interface Blueprint {
  $schema?: string;
  apiVersion: typeof API_VERSION;
  kind: typeof BLUEPRINT_KIND;
  target: BlueprintTarget;
  metadata: BlueprintMetadata;
  tasteProfile?: TasteProfile;
  policy?: BlueprintPolicy;
  tokens: BlueprintTokens;
  assets?: BlueprintAsset[];
  parts?: Record<string, BlueprintTemplate>;
  templates: Record<string, BlueprintTemplate>;
  patterns?: Record<string, BlueprintTemplate>;
  styleVariations?: BlueprintStyleVariation[];
}

export interface Diagnostic {
  code: string;
  severity: "error" | "warning" | "info";
  path: string;
  message: string;
  suggestion?: string;
  suggestedPatch?: Array<{
    op: "add" | "replace" | "remove";
    path: string;
    value?: unknown;
  }>;
}
