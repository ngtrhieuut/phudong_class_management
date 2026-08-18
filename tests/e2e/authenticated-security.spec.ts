import { test, expect, type Page } from "@playwright/test";

const teacherEmail = process.env.E2E_TEACHER_EMAIL;
const teacherPassword = process.env.E2E_TEACHER_PASSWORD;
const guardianEmail = process.env.E2E_GUARDIAN_EMAIL;
const guardianPassword = process.env.E2E_GUARDIAN_PASSWORD;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const organizationId = process.env.E2E_ORGANIZATION_ID;
const classId = process.env.E2E_CLASS_ID;
const studentId = process.env.E2E_STUDENT_ID;
const behaviorTemplateId = process.env.E2E_BEHAVIOR_TEMPLATE_ID;
const rewardId = process.env.E2E_REWARD_ID;

async function signIn(page: Page, email: string, password: string) {
  await page.goto(`/auth/sign-in?next=${encodeURIComponent("/teacher/dashboard")}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForLoadState("domcontentloaded");
}

test.describe("authenticated tenant and atomicity boundaries", () => {
  test.skip(!teacherEmail || !teacherPassword || !guardianEmail || !guardianPassword || !adminEmail || !adminPassword || !organizationId || !classId || !studentId, "Requires dedicated E2E accounts and fixture IDs.");

  test("teacher can use its assigned class but an authenticated guardian cannot mutate admin state", async ({ page, browser }) => {
    await signIn(page, teacherEmail!, teacherPassword!);
    await expect(page).toHaveURL(/\/teacher\/dashboard/);
    const teacherContext = await browser.newContext();
    const guardianPage = await teacherContext.newPage();
    await signIn(guardianPage, guardianEmail!, guardianPassword!);
    const response = await guardianPage.request.post("/api/admin", { data: { action: "organization.update", organizationId, name: "forbidden-test", code: "FORBIDDEN" } });
    expect(response.status()).toBe(403);
    await teacherContext.close();
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await signIn(adminPage, adminEmail!, adminPassword!);
    await expect(adminPage).toHaveURL(/\/teacher\/dashboard/);
    await adminContext.close();
  });

  test.skip(!teacherEmail || !teacherPassword || !behaviorTemplateId || !rewardId, "Requires mutation fixture IDs and explicit test account.");

  test("score and reward retries are idempotent", async ({ page }) => {
    await signIn(page, teacherEmail!, teacherPassword!);
    const scoreKey = `e2e-score-${Date.now()}`;
    const scorePayload = { classId, studentIds: [studentId], behaviorTemplateId, reason: "E2E idempotency" };
    const firstScore = await page.request.post("/api/teacher/score", { headers: { "idempotency-key": scoreKey }, data: scorePayload });
    const secondScore = await page.request.post("/api/teacher/score", { headers: { "idempotency-key": scoreKey }, data: scorePayload });
    expect(firstScore.ok()).toBeTruthy();
    expect(secondScore.ok()).toBeTruthy();
    await expect(secondScore.json()).resolves.toEqual(await firstScore.json());

    const rewardKey = `e2e-reward-${Date.now()}`;
    const rewardPayload = { classId, studentId, rewardId };
    const firstReward = await page.request.post("/api/teacher/rewards/redeem", { headers: { "idempotency-key": rewardKey }, data: rewardPayload });
    const secondReward = await page.request.post("/api/teacher/rewards/redeem", { headers: { "idempotency-key": rewardKey }, data: rewardPayload });
    expect(firstReward.ok()).toBeTruthy();
    expect(secondReward.ok()).toBeTruthy();
    await expect(secondReward.json()).resolves.toEqual(await firstReward.json());
  });
});
