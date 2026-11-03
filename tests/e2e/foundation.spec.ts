import { expect, test } from "@playwright/test";

test("shows the foundation page in Portuguese without horizontal overflow", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Nosso Bolso/);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Mais clareza no bolso.");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Pular para o conteúdo" })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("heading", { level: 1 }).click();
  await page.screenshot({ path: testInfo.outputPath("foundation.png"), fullPage: true });
});
