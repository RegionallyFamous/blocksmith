export interface ScreenshotResult {
  viewport: "desktop" | "mobile";
  path: string;
}

export async function captureScreenshotSet(baseUrl: string, outDir: string): Promise<ScreenshotResult[]> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const results: ScreenshotResult[] = [];

  try {
    for (const target of [
      { viewport: "desktop" as const, width: 1440, height: 1200 },
      { viewport: "mobile" as const, width: 390, height: 1200 }
    ]) {
      const page = await browser.newPage({ viewport: { width: target.width, height: target.height } });
      await page.goto(baseUrl, { waitUntil: "networkidle" });
      const path = `${outDir}/${target.viewport}.png`;
      await page.screenshot({ path, fullPage: true });
      await page.close();
      results.push({ viewport: target.viewport, path });
    }
  } finally {
    await browser.close();
  }

  return results;
}

