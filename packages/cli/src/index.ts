#!/usr/bin/env node
import { Command } from "commander";
import { parse as parseYaml } from "yaml";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import AdmZip from "adm-zip";
import { API_VERSION, BLUEPRINT_KIND, type Blueprint } from "@blocksmith/schema";
import { compileBlueprint } from "@blocksmith/compiler";
import { validateBlueprint, validateThemeOutput, captureScreenshotSet, runWordPressToolChecks } from "@blocksmith/validator";
import { analyzeTaste } from "@blocksmith/taste";

const program = new Command();

program
  .name("blocksmith")
  .description("Compile LLM-friendly Block Theme Blueprints into WordPress block themes.")
  .version("0.1.0");

program
  .command("init")
  .description("Create a starter theme.blueprint.yaml in the current directory.")
  .option("-f, --force", "Overwrite an existing file.")
  .action(async (options: { force?: boolean }) => {
    const path = "theme.blueprint.yaml";
    if (!options.force) {
      try {
        await readFile(path, "utf8");
        throw new Error(`${path} already exists. Use --force to overwrite.`);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }
    }
    await writeFile(path, starterBlueprint(), "utf8");
    console.log(`Created ${path}`);
  });

program
  .command("build")
  .argument("<blueprint>", "Blueprint JSON or YAML file.")
  .option("-o, --out <dir>", "Output directory.", "dist/theme")
  .description("Compile a blueprint into a WordPress block theme folder.")
  .action(async (blueprintPath: string, options: { out: string }) => {
    const blueprint = await loadBlueprint(blueprintPath);
    const result = compileBlueprint(blueprint);
    await writeFiles(options.out, result.files);
    await copyAssets(blueprint, blueprintPath, options.out);
    console.log(`Built ${result.themeSlug} into ${options.out}`);
  });

program
  .command("validate")
  .argument("<blueprint>", "Blueprint JSON or YAML file.")
  .description("Validate a blueprint and the generated static theme artifacts.")
  .action(async (blueprintPath: string) => {
    const blueprint = await loadBlueprint(blueprintPath);
    const blueprintReport = validateBlueprint(blueprint);
    const compileResult = compileBlueprint(blueprint);
    const themeReport = validateThemeOutput(compileResult.files, blueprint);
    const report = mergeReports(blueprintReport, themeReport);
    printReport(report);
    process.exitCode = report.ok ? 0 : 1;
  });

program
  .command("taste")
  .argument("<blueprint>", "Blueprint JSON or YAML file.")
  .option("-o, --out <file>", "Write taste report JSON.")
  .description("Score the blueprint against its taste profile.")
  .action(async (blueprintPath: string, options: { out?: string }) => {
    const blueprint = await loadBlueprint(blueprintPath);
    const report = analyzeTaste(blueprint);
    const json = `${JSON.stringify(report, null, 2)}\n`;
    if (options.out) {
      await mkdir(dirname(options.out), { recursive: true });
      await writeFile(options.out, json, "utf8");
    }
    console.log(json);
    process.exitCode = report.findings.some((finding) => finding.severity === "error") ? 1 : 0;
  });

program
  .command("verify")
  .argument("<blueprint>", "Blueprint JSON or YAML file.")
  .option("-o, --out <dir>", "Verification output directory.", ".blocksmith/verify")
  .option("--screenshot-url <url>", "Capture Playwright screenshots from a running WordPress URL.")
  .option("--wp-path <dir>", "Install into a local WordPress root, activate Theme Check/Create Block Theme, and run wp theme-check.")
  .option("--skip-tool-install", "Do not install Theme Check/Create Block Theme before running WP tool checks.")
  .description("Compile, validate, taste-score, and write evidence reports.")
  .action(async (blueprintPath: string, options: { out: string; screenshotUrl?: string; wpPath?: string; skipToolInstall?: boolean }) => {
    const blueprint = await loadBlueprint(blueprintPath);
    const compileResult = compileBlueprint(blueprint);
    const themeDir = join(options.out, "theme");
    await rm(options.out, { recursive: true, force: true });
    await writeFiles(themeDir, compileResult.files);
    await copyAssets(blueprint, blueprintPath, themeDir);

    const validation = mergeReports(validateBlueprint(blueprint), validateThemeOutput(compileResult.files, blueprint));
    const taste = analyzeTaste(blueprint);
    let wordpressTools: Awaited<ReturnType<typeof runWordPressToolChecks>> | undefined;

    if (options.screenshotUrl) {
      const screenshotDir = join(options.out, "screenshots");
      await mkdir(screenshotDir, { recursive: true });
      const screenshots = await captureScreenshotSet(options.screenshotUrl, screenshotDir);
      taste.findings.push(...screenshots.map((screenshot) => ({
        code: "BS_SCREENSHOT_CAPTURED",
        severity: "info" as const,
        dimension: "responsiveness" as const,
        path: "/screenshots",
        message: `Captured ${screenshot.viewport} screenshot.`,
        screenshot: screenshot.path
      })));
    }

    if (options.wpPath) {
      wordpressTools = await runWordPressToolChecks({
        wpPath: options.wpPath,
        themeDir,
        themeSlug: compileResult.themeSlug,
        installTools: !options.skipToolInstall
      });
      validation.diagnostics.push(...wordpressTools.diagnostics);
      validation.checks.push("theme-check-plugin", "create-block-theme-plugin");
      validation.ok = validation.ok && wordpressTools.ok;
    }

    await writeFile(join(options.out, "validation-report.json"), `${JSON.stringify({ ...validation, wordpressTools }, null, 2)}\n`, "utf8");
    await writeFile(join(options.out, "taste-report.json"), `${JSON.stringify(taste, null, 2)}\n`, "utf8");
    console.log(`Wrote verification evidence to ${options.out}`);
    process.exitCode = validation.ok && taste.findings.every((finding) => finding.severity !== "error") ? 0 : 1;
  });

program
  .command("preview")
  .argument("<blueprint>", "Blueprint JSON or YAML file.")
  .option("-o, --out <dir>", "Preview bundle output directory.", ".blocksmith/preview")
  .option("--with-wp-tools", "Include Theme Check and Create Block Theme in the Playground blueprint.")
  .description("Create a self-contained Playground preview bundle scaffold.")
  .action(async (blueprintPath: string, options: { out: string; withWpTools?: boolean }) => {
    const blueprint = await loadBlueprint(blueprintPath);
    const compileResult = compileBlueprint(blueprint);
    const themeDir = join(options.out, "theme");
    await rm(options.out, { recursive: true, force: true });
    await writeFiles(themeDir, compileResult.files);
    await copyAssets(blueprint, blueprintPath, themeDir);
    const zipPath = join(options.out, "theme.zip");
    zipDirectory(themeDir, zipPath, compileResult.themeSlug);
    const playgroundBlueprint = options.withWpTools
      ? withWordPressToolPlugins(compileResult.files["playground/blueprint.json"])
      : compileResult.files["playground/blueprint.json"];
    await writeFile(join(options.out, "blueprint.json"), playgroundBlueprint, "utf8");
    console.log(`Wrote Playground preview scaffold to ${options.out}`);
  });

program
  .command("package")
  .argument("<blueprint>", "Blueprint JSON or YAML file.")
  .option("-o, --out <file>", "Theme zip path.")
  .description("Build and package a generated theme zip.")
  .action(async (blueprintPath: string, options: { out?: string }) => {
    const blueprint = await loadBlueprint(blueprintPath);
    const compileResult = compileBlueprint(blueprint);
    const temp = join(tmpdir(), `blocksmith-${compileResult.themeSlug}-${Date.now()}`);
    await writeFiles(temp, compileResult.files);
    await copyAssets(blueprint, blueprintPath, temp);
    const out = options.out ?? `dist/${compileResult.themeSlug}.zip`;
    await mkdir(dirname(out), { recursive: true });
    zipDirectory(temp, out, compileResult.themeSlug);
    console.log(`Packaged ${out}`);
  });

program.parseAsync().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});

async function loadBlueprint(path: string): Promise<Blueprint> {
  const raw = await readFile(path, "utf8");
  const ext = extname(path).toLowerCase();
  const parsed = ext === ".yaml" || ext === ".yml" ? parseYaml(raw) : JSON.parse(raw);
  return parsed as Blueprint;
}

async function writeFiles(root: string, files: Record<string, string>) {
  for (const [relative, content] of Object.entries(files)) {
    const path = join(root, relative);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, "utf8");
  }
}

async function copyAssets(blueprint: Blueprint, blueprintPath: string, themeRoot: string) {
  const blueprintDir = dirname(resolve(blueprintPath));
  for (const asset of blueprint.assets ?? []) {
    if (/^https?:\/\//.test(asset.source)) {
      throw new Error(`Remote asset sources are not supported by the v1 compiler: ${asset.source}`);
    }

    const source = isAbsolute(asset.source) ? asset.source : resolve(blueprintDir, asset.source);
    const target = join(themeRoot, asset.path);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
  }
}

function zipDirectory(dir: string, out: string, rootName?: string) {
  const zip = new AdmZip();
  zip.addLocalFolder(dir, rootName);
  zip.writeZip(out);
}

function mergeReports(...reports: Array<{ ok: boolean; diagnostics: unknown[]; checks: string[] }>) {
  return {
    ok: reports.every((report) => report.ok),
    checkedAt: new Date().toISOString(),
    checks: reports.flatMap((report) => report.checks),
    diagnostics: reports.flatMap((report) => report.diagnostics)
  };
}

function printReport(report: ReturnType<typeof mergeReports>) {
  console.log(JSON.stringify(report, null, 2));
}

function withWordPressToolPlugins(blueprintJson: string) {
  const blueprint = JSON.parse(blueprintJson) as {
    features?: Record<string, unknown>;
    steps?: Array<Record<string, unknown>>;
  };
  blueprint.features = { ...(blueprint.features ?? {}), networking: true };
  const installSteps = [
    {
      step: "installPlugin",
      pluginData: {
        resource: "wordpress.org/plugins",
        slug: "theme-check"
      },
      options: {
        activate: true
      }
    },
    {
      step: "installPlugin",
      pluginData: {
        resource: "wordpress.org/plugins",
        slug: "create-block-theme"
      },
      options: {
        activate: true
      }
    }
  ];
  blueprint.steps = [...installSteps, ...(blueprint.steps ?? [])];
  return `${JSON.stringify(blueprint, null, 2)}\n`;
}

function starterBlueprint() {
  return `apiVersion: ${API_VERSION}
kind: ${BLUEPRINT_KIND}
target:
  wordpress: ">=6.6"
  themeJson: 3
  php: ">=8.1"
  blockProfile: core-stable
metadata:
  name: "Starter Journal"
  slug: starter-journal
  description: "A clean editorial block theme draft."
tasteProfile: editorial-clean
policy:
  profile: wporg-block-theme-v1
  allowRawCode: false
  allowRemoteAssets: false
tokens:
  color:
    base: "#ffffff"
    contrast: "#111111"
    primary: "#3157d5"
    muted: "#f4f1ea"
    surface: "#ffffff"
    surfaceAlt: "#f7f7f7"
    border: "#d7d7d7"
    link: "#2547b8"
    buttonBg: "#111111"
    buttonText: "#ffffff"
    focus: "#3157d5"
  typography:
    bodyFont: "Inter, sans-serif"
    headingFont: "Georgia, serif"
  spacing:
    xs: "0.5rem"
    sm: "1rem"
    md: "1.5rem"
    lg: "3rem"
    xl: "4.5rem"
    xxl: "6rem"
  layout:
    contentSize: "720px"
    wideSize: "1180px"
templates:
  index:
    sections:
      - kind: part
        ref: header
      - kind: hero
        title: "Starter Journal"
        text: "A measured, readable WordPress theme with a confident editorial rhythm."
        cta:
          label: "Read latest"
          url: "#latest"
      - kind: postGrid
        title: "Latest writing"
        query:
          perPage: 6
      - kind: part
        ref: footer
`;
}
