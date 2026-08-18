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

test("registration page validates password confirmation before calling auth", async ({ page }) => {
  await page.goto("/auth/sign-up");

  await expect(page.getByRole("heading", { name: "Tạo tài khoản" })).toBeVisible();
  const nameField = page.getByLabel("Họ và tên");

  // Public CI runs do not receive production Neon Auth secrets. In that
  // environment the page must show its explicit setup state instead of
  // attempting to exercise a form that cannot submit yet.
  if ((await nameField.count()) === 0) {
    await expect(page.getByText("Authentication chưa được cấu hình", { exact: false })).toBeVisible();
    return;
  }

  await nameField.fill("Nguyễn Thị Mai");
  await page.getByLabel("Email").fill("mai@example.com");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("matkhau-an-toan");
  await page.getByLabel("Nhập lại mật khẩu").fill("matkhau-khac");
  await page.getByRole("button", { name: "Tạo tài khoản" }).click();

  await expect(page.locator("form p[role='alert']")).toContainText("Mật khẩu xác nhận không khớp");
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
  expect(response.headers()["permissions-policy"]).toContain("camera=()");
  expect(response.headers()["cross-origin-opener-policy"]).toBe("same-origin");
  expect(response.headers()["cross-origin-resource-policy"]).toBe("same-origin");
  const csp = response.headers()["content-security-policy"];
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("strict-dynamic");
  expect(csp).toContain("https://*.blob.vercel-storage.com");
  expect(response.headers()["strict-transport-security"]).toContain("max-age=63072000");
});

test("mutating API requests reject cross-origin callers before authentication", async ({ request }) => {
  const response = await request.post("/api/teacher/score", {
    headers: { origin: "https://evil.example" },
    data: {},
  });
  expect(response.status()).toBe(403);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
