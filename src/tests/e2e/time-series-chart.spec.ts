import { expect, test } from "@playwright/test";

test("desktop: chart period switch and hover marker", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop scenario");
  await page.goto("/ui-kit");
  await expect(page.getByRole("heading", { name: "Time series chart" })).toBeVisible();

  const chartArea = page.getByTestId("time-series-chart-area");
  await expect(chartArea).toBeVisible();

  await page.getByRole("tab", { name: "Year" }).click();
  await expect(page.getByRole("tab", { name: "Year" })).toHaveAttribute("aria-selected", "true");

  await chartArea.hover({ position: { x: 220, y: 110 } });
  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.locator("line[stroke-dasharray='4 4']")).toHaveCount(1);
});

test("mobile: chart supports tap-and-hold marker", async ({ page, browserName }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile scenario");
  test.skip(browserName !== "chromium", "TouchEvent payload is validated in Chromium runs.");

  await page.goto("/ui-kit");
  const chartArea = page.getByTestId("time-series-chart-area");
  await expect(chartArea).toBeVisible();

  const box = await chartArea.boundingBox();
  if (!box) {
    throw new Error("Chart area box is unavailable");
  }

  const x = box.x + 180;
  const y = box.y + 120;
  await page.dispatchEvent("[data-testid='time-series-chart-area']", "touchstart", {
    touches: [{ identifier: 1, clientX: x, clientY: y }],
  });
  await page.waitForTimeout(220);

  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.locator("line[stroke-dasharray='4 4']")).toHaveCount(1);

  await page.dispatchEvent("[data-testid='time-series-chart-area']", "touchend", {
    touches: [],
    changedTouches: [{ identifier: 1, clientX: x, clientY: y }],
  });
  await expect(page.getByRole("status")).toBeHidden();
});
