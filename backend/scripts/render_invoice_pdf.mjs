import { createRequire } from "node:module";
import { existsSync } from "node:fs";

const frontendPackageJson = existsSync("/app/frontend/package.json")
  ? "/app/frontend/package.json"
  : "/frontend/package.json";
const require = createRequire(frontendPackageJson);
const puppeteer = require("puppeteer");

const [, , url, outputPath] = process.argv;

if (!url || !outputPath) {
  console.error("Usage: node render_invoice_pdf.mjs <url> <outputPath>");
  process.exit(1);
}

// PUPPETEER_EXECUTABLE_PATH env var (set in Dockerfile) points to system Chromium,
// which is the correct architecture for the container (ARM64 / x86_64).
const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  const page = await browser.newPage();

  // Match viewport to A4 print content dimensions so the JS page-break
  // measurements taken inside the page correspond to the PDF layout.
  // A4 (210mm × 297mm) minus 12mm margins each side → 186mm × 273mm
  // At CSS resolution of 96dpi: 186mm × (96/25.4) ≈ 703px wide,
  //                              273mm × (96/25.4) ≈ 1032px per page height
  await page.setViewport({ width: 703, height: 1122, deviceScaleFactor: 1 });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(
    () => document.body?.getAttribute("data-invoice-ready") === "true",
    { timeout: 60000 },
  );
  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
    margin: {
      top: "12mm",
      right: "12mm",
      bottom: "12mm",
      left: "12mm",
    },
  });
} finally {
  await browser.close();
}
