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
