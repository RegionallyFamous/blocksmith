import type { Blueprint, BlueprintSection, Diagnostic, TasteProfile } from "@blocksmith/schema";
import { getSectionVariant } from "@blocksmith/sections";

export interface TasteScores {
  hierarchy: number;
  rhythm: number;
  proportion: number;
  contrast: number;
  restraint: number;
  coherence: number;
  responsiveness: number;
  overall: number;
}

export interface TasteFinding extends Diagnostic {
  dimension: keyof Omit<TasteScores, "overall">;
  screenshot?: string;
}

export interface TasteReport {
  profile: TasteProfile;
  scores: TasteScores;
  findings: TasteFinding[];
  summary: string;
}

const profileExpectations: Record<TasteProfile, { density: "low" | "medium" | "high"; ideal: string[] }> = {
  "editorial-clean": { density: "medium", ideal: ["blog", "magazine"] },
  "portfolio-bold": { density: "medium", ideal: ["portfolio"] },
  "small-business-trustworthy": { density: "medium", ideal: ["small-business"] },
  "magazine-dense": { density: "high", ideal: ["magazine"] },
  "nonprofit-warm": { density: "medium", ideal: ["nonprofit"] }
};

export function analyzeTaste(blueprint: Blueprint): TasteReport {
  const profile = blueprint.tasteProfile ?? "editorial-clean";
  const findings: TasteFinding[] = [];
  const sections = collectSections(blueprint);
  const scores: TasteScores = {
    hierarchy: 88,
    rhythm: 88,
    proportion: 88,
    contrast: 88,
    restraint: 88,
    coherence: 88,
    responsiveness: 88,
    overall: 88
  };

  const hasHero = sections.some((section) => section.kind === "hero");
  const hasHeader = sections.some((section) => section.kind === "header" || (section.kind === "part" && section.ref === "header"));
  const hasFooter = sections.some((section) => section.kind === "footer" || (section.kind === "part" && section.ref === "footer"));

  if (!hasHero) {
    lower(scores, "hierarchy", 18);
    findings.push(finding("BS_TASTE_MISSING_HERO", "warning", "hierarchy", "/templates", "No hero section found. Add one strong opening section so the page has an immediate focal point.", "Add a hero section near the top of index/front-page."));
  }

  if (!hasHeader || !hasFooter) {
    lower(scores, "coherence", 12);
    findings.push(finding("BS_TASTE_WEAK_FRAME", "warning", "coherence", "/templates", "The theme frame is underpowered. Header and footer should be explicit parts.", "Use header and footer template parts in major templates."));
  }

  detectRepeats(sections, scores, findings);
  checkContrast(blueprint, scores, findings);
  checkFonts(blueprint, scores, findings);
  checkProfileFit(profile, sections, scores, findings);
  checkEmptyHero(sections, scores, findings);

  scores.overall = Math.round(
    (scores.hierarchy + scores.rhythm + scores.proportion + scores.contrast + scores.restraint + scores.coherence + scores.responsiveness) / 7
  );

  return {
    profile,
    scores,
    findings,
    summary: summarize(scores)
  };
}

function collectSections(blueprint: Blueprint): BlueprintSection[] {
  const templates = Object.values(blueprint.templates).flatMap((template) => template.sections);
  const parts = Object.values(blueprint.parts ?? {}).flatMap((template) => template.sections);
  const patterns = Object.values(blueprint.patterns ?? {}).flatMap((template) => template.sections);
  return [...templates, ...parts, ...patterns];
}

function detectRepeats(sections: BlueprintSection[], scores: TasteScores, findings: TasteFinding[]) {
  for (let index = 0; index < sections.length - 2; index += 1) {
    const a = sections[index]?.kind;
    if (a && sections[index + 1]?.kind === a && sections[index + 2]?.kind === a) {
      lower(scores, "rhythm", 25);
      findings.push(finding("BS_TASTE_REPEATED_SECTION", "error", "rhythm", `/sections/${index}`, `The ${a} section repeats three times in a row.`, "Break the rhythm with a different section type or merge repeated content."));
    }
  }
}

function checkContrast(blueprint: Blueprint, scores: TasteScores, findings: TasteFinding[]) {
  const color = blueprint.tokens.color;
  const bg = color.base;
  const text = color.contrast;
  const ratio = contrastRatio(bg, text);
  if (ratio < 4.5) {
    lower(scores, "contrast", 40);
    findings.push(finding("BS_TASTE_LOW_CONTRAST", "error", "contrast", "/tokens/color", `Base and contrast colors only reach ${ratio.toFixed(2)}:1.`, "Adjust base/contrast tokens to reach at least 4.5:1 for normal text."));
  }

  if (color.buttonBg && color.buttonText && contrastRatio(color.buttonBg, color.buttonText) < 4.5) {
    lower(scores, "contrast", 25);
    findings.push(finding("BS_TASTE_BUTTON_CONTRAST", "error", "contrast", "/tokens/color/buttonText", "Button background and text contrast is too low.", "Change buttonText or buttonBg to improve CTA readability."));
  }
}

function checkFonts(blueprint: Blueprint, scores: TasteScores, findings: TasteFinding[]) {
  const fonts = new Set([blueprint.tokens.typography.bodyFont, blueprint.tokens.typography.headingFont].map((font) => font.trim()));
  if (fonts.size > 2) {
    lower(scores, "restraint", 18);
    findings.push(finding("BS_TASTE_TOO_MANY_FONTS", "warning", "restraint", "/tokens/typography", "The profile uses too many font families.", "Limit v1 themes to one body family and one heading family."));
  }
}

function checkProfileFit(profile: TasteProfile, sections: BlueprintSection[], scores: TasteScores, findings: TasteFinding[]) {
  const expectation = profileExpectations[profile];
  const mismatches = sections.filter((section) => {
    const metadata = getSectionVariant(section.kind, section.variant);
    return metadata && metadata.preferredProfiles.length && !metadata.preferredProfiles.includes(profile);
  });

  if (mismatches.length > Math.max(2, sections.length / 2)) {
    lower(scores, "coherence", 18);
    findings.push(finding("BS_TASTE_PROFILE_MISMATCH", "warning", "coherence", "/tasteProfile", `Many section variants do not naturally fit ${profile}.`, `Prefer variants tuned for ${expectation.ideal.join(", ")} sites.`));
  }
}

function checkEmptyHero(sections: BlueprintSection[], scores: TasteScores, findings: TasteFinding[]) {
  const emptyHero = sections.find((section) => section.kind === "hero" && !section.title && !section.text);
  if (emptyHero) {
    lower(scores, "hierarchy", 35);
    findings.push(finding("BS_TASTE_EMPTY_HERO", "error", "hierarchy", "/templates", "A hero exists but lacks a title and supporting copy.", "Give the hero a specific title and one sentence of useful positioning."));
  }
}

function lower(scores: TasteScores, key: keyof Omit<TasteScores, "overall">, amount: number) {
  scores[key] = Math.max(0, scores[key] - amount);
}

function finding(code: string, severity: TasteFinding["severity"], dimension: TasteFinding["dimension"], path: string, message: string, suggestion: string): TasteFinding {
  return {
    code,
    severity,
    dimension,
    path,
    message,
    suggestion
  };
}

function summarize(scores: TasteScores): string {
  if (scores.overall >= 85) {
    return "Taste gates pass. The theme has a clear hierarchy, coherent tokens, and enough rhythm to be a credible draft.";
  }
  if (scores.overall >= 70) {
    return "Taste gates pass with warnings. The theme is usable but needs visual tightening before release.";
  }
  return "Taste gates fail. Repair the high-severity findings before treating this as a presentable theme.";
}

function contrastRatio(left: string, right: string): number {
  const l1 = relativeLuminance(left);
  const l2 = relativeLuminance(right);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function parseHex(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3 ? normalized.split("").map((char) => char + char).join("") : normalized.slice(0, 6);
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16)
  ];
}

