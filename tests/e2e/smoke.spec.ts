import { test, expect } from "@playwright/test";

test("public landing page renders the Phù Đổng entry point", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Phù Đổng/);
  await expect(
    page.getByRole("heading", { name: "Lớp học tiến bộ từng ngày." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Đăng nhập hệ thống" })).toHaveAttribute(
    "href",
    "/auth/sign-in",
  );
});

test("protected teacher dashboard redirects unauthenticated visitors", async ({ page }) => {
  await page.goto("/teacher/dashboard");

  await expect(page).toHaveURL(/\/auth\/sign-in(?:\?setup=required)?$/);
  await expect(page.getByRole("heading", { name: "Chào mừng trở lại" })).toBeVisible();
});

test("public shell exposes safe PWA assets and security headers", async ({ request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  expect(manifest.headers()["content-type"]).toContain("application/manifest+json");
  await expect(manifest.json()).resolves.toMatchObject({
    display: "standalone",
    lang: "vi-VN",
  });

  const serviceWorker = await request.get("/sw.js");
  expect(serviceWorker.ok()).toBeTruthy();
  expect(await serviceWorker.text()).toContain("Never cache authenticated pages");

  const response = await request.get("/");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});
