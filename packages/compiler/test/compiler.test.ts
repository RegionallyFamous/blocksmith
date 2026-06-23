import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { compileBlueprint } from "../src/index.js";
import { validateThemeOutput } from "@blocksmith/validator";
import type { Blueprint } from "@blocksmith/schema";

const examples = ["blog", "portfolio", "small-business", "magazine", "nonprofit"];

describe("compileBlueprint", () => {
  for (const example of examples) {
    it(`compiles ${example}`, () => {
      const blueprint = parseYaml(readFileSync(`examples/${example}.blueprint.yaml`, "utf8")) as Blueprint;
      const result = compileBlueprint(blueprint);
      expect(result.files["style.css"]).toContain(`Theme Name: ${blueprint.metadata.name}`);
      expect(result.files["theme.json"]).toContain("\"version\": 3");
      expect(result.files["templates/index.html"]).toContain("wp:template-part");
      expect(result.files["parts/header.html"]).toContain("wp:site-title");
      expect(validateThemeOutput(result.files, blueprint).ok).toBe(true);
    });
  }
});

