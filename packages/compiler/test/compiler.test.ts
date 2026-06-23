import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { compileBlueprint } from "../src/index.js";
import { validateThemeOutput } from "@blocksmith/validator";
import type { Blueprint } from "@blocksmith/schema";

const examples = ["blog", "portfolio", "small-business", "magazine", "nonprofit"];
const requiredTemplates = [
  "404",
  "archive",
  "attachment",
  "author",
  "category",
  "date",
  "embed",
  "front-page",
  "home",
  "index",
  "page",
  "page-wide",
  "privacy-policy",
  "search",
  "single",
  "single-post",
  "singular",
  "tag",
  "taxonomy"
];

describe("compileBlueprint", () => {
  for (const example of examples) {
    it(`compiles ${example}`, () => {
      const blueprint = parseYaml(readFileSync(`examples/${example}.blueprint.yaml`, "utf8")) as Blueprint;
      const result = compileBlueprint(blueprint);
      expect(result.files["style.css"]).toContain(`Theme Name: ${blueprint.metadata.name}`);
      expect(result.files["theme.json"]).toContain("\"version\": 3");
      expect(result.files["templates/index.html"]).toContain("wp:template-part");
      expect(result.files["parts/header.html"]).toContain("wp:site-title");
      for (const template of requiredTemplates) {
        expect(result.files[`templates/${template}.html`]).toBeTruthy();
      }
      expect(validateThemeOutput(result.files, blueprint).ok).toBe(true);
    });
  }

  it("uses inherited queries for WordPress loop templates", () => {
    const blueprint = parseYaml(readFileSync("examples/regionally-famous.blueprint.yaml", "utf8")) as Blueprint;
    const result = compileBlueprint(blueprint);

    expect(result.files["patterns/home-2-postgrid.php"]).toContain('"inherit":true');
    expect(result.files["patterns/archive-3-postgrid.php"]).toContain('"inherit":true');
    expect(result.files["patterns/category-3-postgrid.php"]).toContain('"inherit":true');
    expect(result.files["patterns/tag-3-postgrid.php"]).toContain('"inherit":true');
    expect(result.files["patterns/author-3-postgrid.php"]).toContain('"inherit":true');
    expect(result.files["patterns/date-3-postgrid.php"]).toContain('"inherit":true');
    expect(result.files["patterns/search-3-searchresults.php"]).toContain('"inherit":true');
    expect(result.files["patterns/front-page-4-postgrid.php"]).toContain('"inherit":false');
    expect(result.files["patterns/index-4-postgrid.php"]).toContain('"inherit":false');
    expect(result.files["patterns/home-2-postgrid.php"]).toContain("wp:query-no-results");
    expect(result.files["patterns/search-2-archiveheader.php"]).toContain('"type":"search"');
  });

  it("emits editor-facing theme.json settings and block styles", () => {
    const blueprint = parseYaml(readFileSync("examples/regionally-famous.blueprint.yaml", "utf8")) as Blueprint;
    const result = compileBlueprint(blueprint);
    const themeJson = JSON.parse(result.files["theme.json"] ?? "{}");

    expect(themeJson.settings.appearanceTools).toBe(true);
    expect(themeJson.settings.useRootPaddingAwareAlignments).toBe(true);
    expect(themeJson.settings.blocks["core/navigation"].typography.fontWeight).toBe(true);
    expect(themeJson.styles.blocks["core/post-title"].typography.fontFamily).toBe("var:preset|font-family|heading");
    expect(themeJson.customTemplates.some((template: { name: string }) => template.name === "page-wide")).toBe(true);
  });
});
