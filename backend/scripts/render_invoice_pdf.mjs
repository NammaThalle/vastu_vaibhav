import { createRequire } from "node:module";

// Resolve puppeteer from the frontend's node_modules (copied into the Docker image).
const require = createRequire("/app/frontend/package.json");
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
