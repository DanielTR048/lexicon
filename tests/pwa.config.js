import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "pwa.spec.js",
  workers: 1,
  timeout: 45_000,
  outputDir: "../output/pwa-test-results",
  use: { browserName: "chromium", headless: true, reducedMotion: "reduce" },
});
