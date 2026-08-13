import { expect, test } from "@playwright/test";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

const viewports = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
  { width: 1280, height: 900 },
  { width: 1440, height: 900 }
] as const;

for (const viewport of viewports) {
  test(`public homepage remains usable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const response = await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle("MyFitPick | AI Personal Stylist for Your Wardrobe");
    await expect(page.getByRole("heading", { level: 1, name: "Your closet. Styled intelligently." })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "From wardrobe photos to a look you can wear." })).toBeVisible();

    const layout = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth
    }));

    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  });
}

test("mobile navigation exposes public destinations", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(750);

  const menuButton = page.getByRole("button", { name: "Open navigation menu" });
  await menuButton.click();
  await expect(page.getByRole("button", { name: "Close navigation menu" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: "How It Works" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Features" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Virtual Try-On", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "FAQ" })).toBeVisible();
  const mobileMenu = page.locator("#public-mobile-menu");
  await expect(page.getByRole("navigation", { name: "Public navigation" }).getByRole("link", { name: "Get Started" })).toBeVisible();
  await expect(mobileMenu.getByRole("link", { name: "Sign In" })).toBeVisible();
});

test("public root stays public while authenticated routes stay protected", async ({ request }) => {
  const rootResponse = await request.get(`${baseUrl}/`, { maxRedirects: 0 });
  const protectedResponse = await request.get(`${baseUrl}/home`, { maxRedirects: 0 });

  expect(rootResponse.status()).toBe(200);
  expect(protectedResponse.status()).toBe(307);
  expect(protectedResponse.headers().location).toBe("/login?next=%2Fhome");
});
