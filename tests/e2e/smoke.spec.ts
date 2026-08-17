import { test, expect } from "@playwright/test";

test("public landing page renders the Phù Đổng entry point", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Phù Đổng/);
  await expect(
    page.getByRole("heading", { name: "Một lớp học tiến bộ, mỗi ngày một niềm vui." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute(
    "href",
    "/auth/sign-in",
  );
});
