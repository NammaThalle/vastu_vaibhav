import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const puppeteer = require("../../frontend/node_modules/puppeteer");

const [, , url, outputPath] = process.argv;

if (!url || !outputPath) {
  console.error("Usage: node render_invoice_pdf.mjs <url> <outputPath>");
  process.exit(1);
}

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
