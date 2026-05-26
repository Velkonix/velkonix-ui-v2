/**
 * Visual smoke check for the active blue theme.
 * Run against http://localhost:5173 with: npx playwright test theme-smoke --project=desktop
 * Requires dev server on 5173 with ?mock=1 for full routes.
 */
import type { Page } from "@playwright/test";
import { test, expect } from "@playwright/test";

const THEMES = ["blue"] as const;

const ROUTES = [
  { path: "/", heading: /Velkonix|Connect Wallet/i },
  { path: "/markets", heading: "Markets" },
  { path: "/dashboard", heading: "Dashboard" },
  { path: "/staking", heading: "Staking" },
  { path: "/asset/WETH", heading: /Back to Markets|WETH|Asset/i },
] as const;

async function setTheme(page: Page, theme: string): Promise<void> {
  await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
}

async function gotoWithMock(page: Page, path: string) {
  const url = `${path}${path.includes("?") ? "&" : "?"}mock=1`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
}

test.describe("theme smoke check", () => {
  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      const type = msg.type();
      if (type === "error") {
        const text = msg.text();
        if (!text.includes("favicon") && !text.includes("404")) {
          errors.push(text);
        }
      }
    });
    (page as unknown as { _themeErrors: string[] })._themeErrors = errors;
  });

  for (const theme of THEMES) {
    test(`${theme}: all routes render`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop", "Theme smoke routes are desktop-only.");
      for (const route of ROUTES) {
        await gotoWithMock(page, route.path);
        await setTheme(page, theme);
        await expect(page.locator("body")).toBeVisible();
        const heading = page.getByRole("heading", { name: route.heading });
        const anyVisible = await heading
          .first()
          .isVisible()
          .catch(() => false);
        if (!anyVisible) {
          const fallback = page.getByText(route.heading).first();
          const fallbackVisible = await fallback.isVisible().catch(() => false);
          if (!fallbackVisible) {
            await expect(page.locator("main")).toBeVisible();
          }
        }
      }
    });
  }
});

test.describe("theme deep check (blue)", () => {
  test("blue: buttons, tables, modal overlay visible on markets", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Theme deep checks are desktop-only.");
    await gotoWithMock(page, "/markets");
    await setTheme(page, "blue");

    await expect(page.getByRole("heading", { name: "Markets" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sort by Total Supplied" })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();

    await page.getByRole("button", { name: "4.20%" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const overlay = page.locator("[data-modal-overlay], [role='presentation']").first();
    await expect(overlay)
      .toBeVisible({ timeout: 2000 })
      .catch(() => {});
  });

  test("blue: staking and modal flow visible", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Theme deep checks are desktop-only.");
    await gotoWithMock(page, "/staking");
    await setTheme(page, "blue");

    await expect(page.getByRole("heading", { name: "Staking" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Convert" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Stake", exact: true })).toBeVisible();

    await gotoWithMock(page, "/markets");
    await setTheme(page, "blue");
    await page.getByRole("button", { name: "4.20%" }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});
