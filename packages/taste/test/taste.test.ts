import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { analyzeTaste } from "../src/index.js";
import type { Blueprint } from "@blocksmith/schema";

describe("analyzeTaste", () => {
  it("scores a known-good example highly", () => {
    const blueprint = parseYaml(readFileSync("examples/blog.blueprint.yaml", "utf8")) as Blueprint;
    const report = analyzeTaste(blueprint);
    expect(report.scores.overall).toBeGreaterThanOrEqual(80);
    expect(report.findings.some((finding) => finding.severity === "error")).toBe(false);
  });

  it("fails predictable ugly inputs", () => {
    const blueprint = parseYaml(readFileSync("fixtures/ugly/repeated-sections.blueprint.yaml", "utf8")) as Blueprint;
    const report = analyzeTaste(blueprint);
    expect(report.findings.some((finding) => finding.code === "BS_TASTE_REPEATED_SECTION")).toBe(true);
    expect(report.findings.some((finding) => finding.code === "BS_TASTE_LOW_CONTRAST")).toBe(true);
  });
});

