import { defineConfig } from "@playwright/test";

/** Config for theme smoke tests — run against existing dev server on 5173 */
export default defineConfig({
  testDir: "./src/tests/e2e",
  testMatch: "theme-smoke.spec.ts",
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
  },
  projects: [
    {
      name: "desktop",
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  timeout: 120000,
  expect: { timeout: 5000 },
});
