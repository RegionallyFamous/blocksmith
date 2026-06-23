#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const screenshotDir = resolve(repoRoot, process.argv[2] ?? ".blocksmith/route-check-screens");
const outputDir = resolve(repoRoot, process.argv[3] ?? ".blocksmith/visual-evidence");
const compDir = resolve(repoRoot, "docs/assets/route-comps");

const pairs = [
  {
    title: "Home",
    comp: "regionally-famous-home.png",
    screenshots: ["desktop-home.png", "mobile-home.png"]
  },
  {
    title: "Archive",
    comp: "regionally-famous-archive.png",
    screenshots: ["desktop-category-place-notes.png", "mobile-category-place-notes.png"]
  },
  {
    title: "Single",
    comp: "regionally-famous-single.png",
    screenshots: ["desktop-story-market-day-on-4th-street.png", "mobile-story-market-day-on-4th-street.png"]
  },
  {
    title: "Page And 404",
    comp: "regionally-famous-page-404.png",
    screenshots: ["desktop-about.png", "desktop-p-999999.png", "mobile-p-999999.png"]
  },
  {
    title: "Mobile Intent",
    comp: "regionally-famous-mobile.png",
    screenshots: ["mobile-home.png", "mobile-category-place-notes.png", "mobile-story-market-day-on-4th-street.png"]
  }
];

function webPath(fromDir, target) {
  return relative(fromDir, target).split("\\").join("/");
}

function imageTag(file, label) {
  if (!existsSync(file)) {
    return `<div class="missing">Missing ${escapeHtml(label)}</div>`;
  }

  return `<figure><img src="${webPath(outputDir, file)}" alt="${escapeHtml(label)}"><figcaption>${escapeHtml(label)}</figcaption></figure>`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}

const sections = pairs.map((pair) => {
  const comp = resolve(compDir, pair.comp);
  const screenshots = pair.screenshots.map((shot) => resolve(screenshotDir, shot));
  return `<section>
  <h2>${escapeHtml(pair.title)}</h2>
  <div class="grid">
    ${imageTag(comp, `${pair.title} Imagegen comp`)}
    ${screenshots.map((shot) => imageTag(shot, shot)).join("\n    ")}
  </div>
</section>`;
}).join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Blocksmith Visual Evidence</title>
  <style>
    body { background: #fffdf7; color: #17130f; font: 15px/1.5 system-ui, sans-serif; margin: 0; padding: 32px; }
    h1, h2 { font-family: Georgia, serif; line-height: 1.05; }
    h1 { font-size: 40px; margin: 0 0 12px; }
    h2 { border-top: 1px solid #dcc9aa; font-size: 28px; margin: 44px 0 18px; padding-top: 18px; }
    p { max-width: 760px; }
    .grid { align-items: start; display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
    figure { background: #fff; border: 1px solid #dcc9aa; margin: 0; padding: 10px; }
    img { display: block; height: auto; width: 100%; }
    figcaption { color: #8e2f22; font-size: 12px; font-weight: 800; margin-top: 8px; text-transform: uppercase; }
    .missing { border: 1px dashed #b63f2d; color: #8e2f22; font-weight: 800; padding: 24px; }
  </style>
</head>
<body>
  <h1>Blocksmith Visual Evidence</h1>
  <p>Compare Imagegen route-family comps against live Playground screenshots. Use this as a concrete polish loop: identify layout, asset, spacing, density, and route-behavior mismatches, then repair the compiler/theme.</p>
  ${sections}
</body>
</html>
`;

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "index.html"), html, "utf8");
console.log(`Wrote ${resolve(outputDir, "index.html")}`);
