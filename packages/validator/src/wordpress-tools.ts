import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Diagnostic } from "@blocksmith/schema";

const execFileAsync = promisify(execFile);

export interface WordPressToolCheckOptions {
  wpPath: string;
  themeDir: string;
  themeSlug: string;
  installTools?: boolean;
}

export interface WordPressToolCheckReport {
  ok: boolean;
  diagnostics: Diagnostic[];
  commands: Array<{
    command: string;
    ok: boolean;
    stdout: string;
    stderr: string;
  }>;
  notes: string[];
}

export async function runWordPressToolChecks(options: WordPressToolCheckOptions): Promise<WordPressToolCheckReport> {
  const diagnostics: Diagnostic[] = [];
  const commands: WordPressToolCheckReport["commands"] = [];
  const notes = [
    "Theme Check is treated as an automated review aid, not a substitute for human review.",
    "Create Block Theme is activated for Site Editor handoff: export zip, save editor changes to theme files, inspect theme.json, and create style variations."
  ];

  const themeTarget = join(options.wpPath, "wp-content", "themes", options.themeSlug);
  await rm(themeTarget, { recursive: true, force: true });
  await mkdir(join(options.wpPath, "wp-content", "themes"), { recursive: true });
  await cp(options.themeDir, themeTarget, { recursive: true });

  if (options.installTools ?? true) {
    await runWp(options.wpPath, commands, ["plugin", "install", "theme-check", "create-block-theme", "--activate"]);
  }

  await runWp(options.wpPath, commands, ["theme", "activate", options.themeSlug]);
  const themeCheck = await runWp(options.wpPath, commands, ["theme-check", "run", options.themeSlug, "--format=json"]);
  await runWp(options.wpPath, commands, ["plugin", "is-active", "create-block-theme"]);

  if (!themeCheck.ok) {
    diagnostics.push({
      code: "BS_THEME_CHECK_FAILED",
      severity: "error",
      path: "/wordpress-tools/theme-check",
      message: "Theme Check returned a non-zero exit code.",
      suggestion: "Inspect wordpressTools.commands in validation-report.json and fix reported theme review issues."
    });
  }

  const createBlockThemeActive = commands.some((entry) => entry.command.includes("plugin is-active create-block-theme") && entry.ok);
  if (!createBlockThemeActive) {
    diagnostics.push({
      code: "BS_CREATE_BLOCK_THEME_INACTIVE",
      severity: "warning",
      path: "/wordpress-tools/create-block-theme",
      message: "Create Block Theme was not confirmed active.",
      suggestion: "Install and activate create-block-theme for Site Editor export and theme.json inspection workflows."
    });
  }

  return {
    ok: diagnostics.every((diagnostic) => diagnostic.severity !== "error"),
    diagnostics,
    commands,
    notes
  };
}

async function runWp(cwd: string, commands: WordPressToolCheckReport["commands"], args: string[]) {
  const command = `wp ${args.join(" ")}`;
  try {
    const result = await execFileAsync("wp", args, { cwd, maxBuffer: 1024 * 1024 * 20 });
    const entry = {
      command,
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr
    };
    commands.push(entry);
    return entry;
  } catch (error) {
    const err = error as Error & { stdout?: string; stderr?: string };
    const entry = {
      command,
      ok: false,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? err.message
    };
    commands.push(entry);
    return entry;
  }
}

