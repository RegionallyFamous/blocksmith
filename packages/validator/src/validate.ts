import * as AjvModule from "ajv/dist/2020.js";
import { parse } from "@wordpress/block-serialization-default-parser";
import { blueprintSchema, type Blueprint, type Diagnostic } from "@blocksmith/schema";

export interface ValidationReport {
  ok: boolean;
  diagnostics: Diagnostic[];
  checkedAt: string;
  checks: string[];
}

const Ajv = ((AjvModule as { default?: unknown }).default ?? AjvModule) as new (options: { allErrors: boolean; strict: boolean }) => {
  compile: (schema: unknown) => {
    (value: unknown): boolean;
    errors?: Array<{ instancePath?: string; message?: string }>;
  };
};
const ajv = new Ajv({ allErrors: true, strict: false });
const validateSchema = ajv.compile(blueprintSchema);

export function validateBlueprint(value: unknown): ValidationReport {
  const ok = validateSchema(value);
  const diagnostics: Diagnostic[] = [];

  if (!ok) {
    for (const error of validateSchema.errors ?? []) {
      diagnostics.push({
        code: "BS_SCHEMA_INVALID",
        severity: "error",
        path: error.instancePath || "/",
        message: `${error.instancePath || "/"} ${error.message ?? "is invalid"}`,
        suggestion: "Change the blueprint to match the Blocksmith schema."
      });
    }
  }

  return {
    ok: diagnostics.every((diagnostic) => diagnostic.severity !== "error"),
    diagnostics,
    checkedAt: new Date().toISOString(),
    checks: ["blueprint-schema"]
  };
}

export function validateThemeOutput(files: Record<string, string>, blueprint?: Blueprint): ValidationReport {
  const diagnostics: Diagnostic[] = [];
  const required = [
    "style.css",
    "readme.txt",
    "theme.json",
    "parts/header.html",
    "parts/footer.html",
    "templates/index.html",
    "templates/front-page.html",
    "templates/home.html",
    "templates/single.html",
    "templates/single-post.html",
    "templates/singular.html",
    "templates/attachment.html",
    "templates/embed.html",
    "templates/page.html",
    "templates/page-wide.html",
    "templates/privacy-policy.html",
    "templates/archive.html",
    "templates/taxonomy.html",
    "templates/category.html",
    "templates/tag.html",
    "templates/author.html",
    "templates/date.html",
    "templates/search.html",
    "templates/404.html"
  ];

  for (const path of required) {
    if (!files[path]) {
      diagnostics.push({
        code: "BS_THEME_MISSING_FILE",
        severity: "error",
        path,
        message: `Generated theme is missing ${path}.`,
        suggestion: "Compiler must emit the full Blocksmith block theme template baseline."
      });
    }
  }

  validateThemeJson(files["theme.json"], diagnostics);
  validateBlockFiles(files, diagnostics);
  scanRemoteUrls(files, diagnostics, blueprint);

  return {
    ok: diagnostics.every((diagnostic) => diagnostic.severity !== "error"),
    diagnostics,
    checkedAt: new Date().toISOString(),
    checks: ["required-files", "theme-json", "block-parser", "remote-url-scan"]
  };
}

function validateThemeJson(content: string | undefined, diagnostics: Diagnostic[]) {
  if (!content) {
    return;
  }

  try {
    const parsed = JSON.parse(content) as {
      customTemplates?: unknown;
      version?: unknown;
      settings?: { blocks?: unknown };
      styles?: { blocks?: unknown };
    };
    if (parsed.version !== 3) {
      diagnostics.push({
        code: "BS_THEME_JSON_VERSION",
        severity: "error",
        path: "theme.json/version",
        message: "theme.json must use version 3 for the v1 target.",
        suggestion: "Set theme.json version to 3."
      });
    }
    if (!parsed.settings || !parsed.styles) {
      diagnostics.push({
        code: "BS_THEME_JSON_INCOMPLETE",
        severity: "error",
        path: "theme.json",
        message: "theme.json must include settings and styles.",
        suggestion: "Emit settings and styles from blueprint tokens."
      });
    }
    if (!parsed.settings?.blocks || !parsed.styles?.blocks) {
      diagnostics.push({
        code: "BS_THEME_JSON_BLOCK_SURFACE",
        severity: "warning",
        path: "theme.json/settings/blocks",
        message: "theme.json should include block-level settings and styles for the editor surface.",
        suggestion: "Emit settings.blocks and styles.blocks for core layout, query, navigation, search, and post blocks."
      });
    }
    if (!Array.isArray(parsed.customTemplates) || parsed.customTemplates.length === 0) {
      diagnostics.push({
        code: "BS_THEME_JSON_CUSTOM_TEMPLATES",
        severity: "warning",
        path: "theme.json/customTemplates",
        message: "theme.json does not expose any custom template metadata.",
        suggestion: "Add customTemplates entries for generated custom template files."
      });
    }
  } catch (error) {
    diagnostics.push({
      code: "BS_THEME_JSON_PARSE",
      severity: "error",
      path: "theme.json",
      message: `theme.json is not valid JSON: ${(error as Error).message}`,
      suggestion: "Fix JSON generation."
    });
  }
}

function validateBlockFiles(files: Record<string, string>, diagnostics: Diagnostic[]) {
  for (const [path, content] of Object.entries(files)) {
    if (!isBlockFile(path)) {
      continue;
    }

    try {
      parse(stripPhpHeader(content));
      const opens = (content.match(/<!-- wp:/g) ?? []).length;
      const closes = (content.match(/<!-- \/wp:/g) ?? []).length;
      const selfClosing = (content.match(/\/-->/g) ?? []).length;
      if (opens < closes || opens === 0) {
        diagnostics.push({
          code: "BS_BLOCK_MARKUP_SUSPECT",
          severity: "warning",
          path,
          message: "Block markup parsed, but delimiter counts look suspicious.",
          suggestion: "Inspect generated block comments for missing wrappers."
        });
      }
      if (selfClosing > opens) {
        diagnostics.push({
          code: "BS_BLOCK_SELF_CLOSING_HEAVY",
          severity: "info",
          path,
          message: "This file contains mostly self-closing dynamic blocks.",
          suggestion: "This is acceptable for dynamic blocks, but verify in WordPress runtime."
        });
      }
    } catch (error) {
      diagnostics.push({
        code: "BS_BLOCK_PARSE",
        severity: "error",
        path,
        message: `Block parser failed: ${(error as Error).message}`,
        suggestion: "Lower the section through the typed block IR instead of raw markup."
      });
    }
  }
}

function scanRemoteUrls(files: Record<string, string>, diagnostics: Diagnostic[], blueprint?: Blueprint) {
  if (blueprint?.policy?.allowRemoteAssets) {
    return;
  }

  for (const [path, content] of Object.entries(files)) {
    if (path === "resources.json") {
      continue;
    }
    const matches = Array.from(content.matchAll(/https?:\/\/[^\s"'<>),]+/g)).map((match) => match[0]);
    const actionable = matches.filter((url) => !isAllowedMetadataUrl(url));
    if (actionable.length) {
      diagnostics.push({
        code: "BS_REMOTE_URL",
        severity: "warning",
        path,
        message: `Generated output includes remote URL(s): ${actionable.join(", ")}`,
        suggestion: "Bundle assets locally for the wporg-block-theme-v1 policy."
      });
    }
  }
}

function isAllowedMetadataUrl(url: string): boolean {
  return (
    url.startsWith("https://schemas.wp.org/") ||
    url === "https://playground.wordpress.net/blueprint-schema.json" ||
    url === "https://blocksmith.io/"
  );
}

function isBlockFile(path: string): boolean {
  return path.startsWith("templates/") || path.startsWith("parts/") || path.startsWith("patterns/");
}

function stripPhpHeader(content: string): string {
  const end = content.indexOf("?>");
  return end >= 0 ? content.slice(end + 2) : content;
}
