import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "*.spec.js",
  timeout: 45_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  outputDir: "test-results",
  use: {
    baseURL: "http://127.0.0.1:5184",
    browserName: "chromium",
    headless: true,
    viewport: { width: 1440, height: 1100 },
    timezoneId: "America/Sao_Paulo",
    reducedMotion: "reduce",
    actionTimeout: 8_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "npm run dev -- --port 5184 --strictPort",
      url: "http://127.0.0.1:5184",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "npm run build && npm run preview -- --port 4184 --strictPort",
      url: "http://127.0.0.1:4184",
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
