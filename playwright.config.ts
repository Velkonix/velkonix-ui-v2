import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src/tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  globalTimeout: 10 * 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "mobile",
      use: {
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "pnpm dev --host 127.0.0.1 --port 4173 --strictPort",
    port: 4173,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
