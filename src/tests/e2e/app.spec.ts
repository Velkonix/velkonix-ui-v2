import { test, expect } from "@playwright/test";

test("mock mode flow shows markets and mock address in connect button", async ({ page }) => {
  await page.goto("/markets?mock=1");

  await expect(page.getByRole("heading", { name: "Markets" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect Wallet" })).toBeVisible();

  await page.getByRole("button", { name: "Connect Wallet" }).click();
  await expect(page.getByRole("button", { name: /0x/i })).toBeVisible();

  await page.getByRole("button", { name: "Sort by Total Supplied" }).click();
  await expect(page.getByRole("button", { name: "4.20%" })).toBeVisible();
  await page.getByRole("button", { name: "4.20%" }).click();
  await expect(page.getByRole("dialog", { name: /Supply APY/i })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Markets" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect Wallet" })).toBeVisible();
});

test("real mode shows wallet connect action", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Connect Wallet" }).first()).toBeVisible();
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

  await page.getByRole("button", { name: "Connect Wallet" }).click();
  await expect(page.getByRole("button", { name: /0x/i })).toBeVisible();

  await page.getByRole("textbox", { name: "Convert amount" }).fill("300");
  await page.getByRole("button", { name: "Convert" }).click();
  await expect(page.getByText("CONVERT success")).toBeVisible();

  await page.getByRole("tab", { name: "Exit" }).click();
  await page.getByRole("textbox", { name: "Exit amount" }).fill("50");
  await page.getByRole("button", { name: "Request Exit" }).click();
  await expect(page.getByText("REQUESTEXIT success")).toBeVisible();
  await expect(page.getByRole("button", { name: "Execute Exit" })).toBeDisabled();
});
