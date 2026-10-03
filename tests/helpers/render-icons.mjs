// Recreate PWA launch icons from the existing vector brand mark.
import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const svg = await readFile(
  new URL("../../public/favicon.svg", import.meta.url),
  "utf8",
);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 512, height: 512 },
    deviceScaleFactor: 1,
  });
  await mkdir(new URL("../../public/icons/", import.meta.url), {
    recursive: true,
  });
  for (const [file, size, maskable] of [
    ["icon-192.png", 192, false],
    ["icon-512.png", 512, false],
    ["icon-maskable-512.png", 512, true],
  ]) {
    const source = maskable
      ? svg
          .replace(
            /<rect[^>]+\/>/,
            '<rect width="64" height="64" fill="#254d3f"/><g transform="translate(12.8 12.8) scale(.6)">',
          )
          .replace("</svg>", "</g></svg>")
      : svg;
    await page.setContent(
      `<style>body{margin:0;background:transparent}img{display:block;width:${size}px;height:${size}px}</style><img src="data:image/svg+xml;base64,${Buffer.from(source).toString("base64")}">`,
    );
    await page
      .locator("img")
      .screenshot({
        path: fileURLToPath(
          new URL(`../../public/icons/${file}`, import.meta.url),
        ),
        omitBackground: true,
      });
  }
} finally {
  await browser.close();
}
