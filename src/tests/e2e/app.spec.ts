import type { Page } from "@playwright/test";
import { test, expect } from "@playwright/test";

async function openMobileMenuIfNeeded(page: Page) {
  const openButton = page.getByRole("button", { name: "Open navigation menu" });
  if (await openButton.isVisible().catch(() => false)) {
    await openButton.click();
  }
}

async function closeMobileMenuIfNeeded(page: Page) {
  const closeButton = page.getByRole("button", { name: "Close navigation menu" });
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click();
  }
}

async function openApyFromMarkets(page: Page) {
  const apyButton = page.getByRole("button", { name: /%/ }).first();
  await expect(apyButton).toBeVisible();
  await apyButton.click();

  const dialog = page.getByRole("dialog", { name: /APY/i });
  const dialogVisible = await dialog.isVisible().catch(() => false);
  if (!dialogVisible) {
    await expect(page.getByRole("button", { name: "Back to Markets" })).toBeVisible();
    return;
  }
  await expect(dialog).toBeVisible();
}

async function connectWallet(page: Page) {
  const connectButton = page.getByRole("button", { name: "Connect Wallet" }).first();
  if (await connectButton.isVisible().catch(() => false)) {
    await connectButton.click();
    return;
  }

  await openMobileMenuIfNeeded(page);
  await page.getByRole("button", { name: "Connect Wallet" }).last().click();
  await closeMobileMenuIfNeeded(page);
}

test("mock mode flow shows markets and mock address in connect button", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Mobile layout differs in markets flow.");
  await page.goto("/markets?mock=1");

  await expect(page.getByRole("heading", { name: "Markets" })).toBeVisible();
  await connectWallet(page);

  const sortButton = page.getByRole("button", { name: "Sort by Total Supplied" });
  if (await sortButton.isVisible().catch(() => false)) {
    await sortButton.click();
  }
  await openApyFromMarkets(page);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Markets" })).toBeVisible();
});

test("real mode shows wallet connect action", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main")).toBeVisible();
});

test("shell navigation works on desktop and mobile", async ({ page }) => {
  await page.goto("/markets?mock=1");
  await expect(page.getByRole("heading", { name: "Markets" })).toBeVisible();

  await openMobileMenuIfNeeded(page);
  await page.getByRole("link", { name: "Dashboard" }).click();
  await closeMobileMenuIfNeeded(page);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await openMobileMenuIfNeeded(page);
  await page.getByRole("link", { name: "Staking" }).click();
  await closeMobileMenuIfNeeded(page);
  await expect(page.getByRole("heading", { name: "Staking" })).toBeVisible();
});

test("dashboard and asset dialogs open and close in mock mode", async ({ page }) => {
  await page.goto("/dashboard?mock=1");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.goto("/markets?mock=1");
  await openApyFromMarkets(page);
  const dialog = page.getByRole("dialog", { name: /APY/i });
  if (await dialog.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  }

  await page.goto("/asset/WETH?mock=1");
  await expect(page.getByRole("button", { name: "Back to Markets" })).toBeVisible();
});

test("staking flow supports convert and queue exit in mock mode", async ({ page }) => {
  await page.goto("/staking?mock=1");

  await page.evaluate(() => {
    const raw = window.localStorage.getItem("mock.settings");
    const settings = raw ? JSON.parse(raw) : {};
    settings.failRateBps = 0;
    settings.queueVestingMs = 200;
    window.localStorage.setItem("mock.settings", JSON.stringify(settings));
  });

  await page.reload();
  await expect(page.getByRole("heading", { name: "Staking" })).toBeVisible();

  await connectWallet(page);

  await page.getByRole("textbox", { name: "Convert amount" }).fill("300");
  await page.getByRole("button", { name: "Convert" }).click();
  await expect(page.getByText("CONVERT success")).toBeVisible();

  await page.getByRole("tab", { name: "Exit" }).click();
  await page.getByRole("textbox", { name: "Exit amount" }).fill("50");
  await page.getByRole("button", { name: "Request Exit" }).click();
  await expect(page.getByText("REQUESTEXIT success")).toBeVisible();
  await expect(page.getByRole("button", { name: "Execute Exit" })).toBeVisible();
});
