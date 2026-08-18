import { randomUUID } from "node:crypto";

import { test, expect, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const teacherEmail = process.env.E2E_TEACHER_EMAIL;
const teacherPassword = process.env.E2E_TEACHER_PASSWORD;
const guardianEmail = process.env.E2E_GUARDIAN_EMAIL;
const guardianPassword = process.env.E2E_GUARDIAN_PASSWORD;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const revokedGuardianEmail = process.env.E2E_REVOKED_GUARDIAN_EMAIL;
const revokedGuardianPassword = process.env.E2E_REVOKED_GUARDIAN_PASSWORD;
const organizationId = process.env.E2E_ORGANIZATION_ID;
const otherOrganizationId = process.env.E2E_OTHER_ORGANIZATION_ID;
const classId = process.env.E2E_CLASS_ID;
const otherClassId = process.env.E2E_OTHER_CLASS_ID;
const studentId = process.env.E2E_STUDENT_ID;
const otherStudentId = process.env.E2E_OTHER_STUDENT_ID;
const behaviorTemplateId = process.env.E2E_BEHAVIOR_TEMPLATE_ID;
const rewardId = process.env.E2E_REWARD_ID;
const otherRewardId = process.env.E2E_OTHER_REWARD_ID;
const guardianChildId = process.env.E2E_GUARDIAN_CHILD_ID;
const guardianChildName = process.env.E2E_GUARDIAN_CHILD_NAME;
const guardianOtherStudentId = process.env.E2E_GUARDIAN_OTHER_STUDENT_ID;
const guardianOtherStudentName = process.env.E2E_GUARDIAN_OTHER_STUDENT_NAME;
const revokedStudentName = process.env.E2E_REVOKED_STUDENT_NAME;
const mediaNotAllowedId = process.env.E2E_MEDIA_NOT_ALLOWED_ID;
const revokedStudentId = process.env.E2E_REVOKED_STUDENT_ID;
const inviteValidToken = process.env.E2E_INVITE_VALID_TOKEN;
const inviteWrongEmailToken = process.env.E2E_INVITE_WRONG_EMAIL_TOKEN;
const inviteExpiredToken = process.env.E2E_INVITE_EXPIRED_TOKEN;
const inviteRevokedToken = process.env.E2E_INVITE_REVOKED_TOKEN;
const inviteConcurrentToken = process.env.E2E_INVITE_CONCURRENT_TOKEN;
const rewardEmptyStudentId = process.env.E2E_REWARD_EMPTY_STUDENT_ID;
const rewardEmptyRewardId = process.env.E2E_REWARD_EMPTY_REWARD_ID;
const concurrentRewardStudentId = process.env.E2E_CONCURRENT_REWARD_STUDENT_ID;
const concurrentRewardId = process.env.E2E_CONCURRENT_REWARD_ID;

function has(...values: Array<string | undefined>): boolean {
  return values.every((value) => Boolean(value?.trim()));
}

function mutationHeaders(page: Page, extra: Record<string, string> = {}) {
  const origin = new URL(page.url()).origin;
  return {
    origin,
    referer: page.url(),
    "content-type": "application/json",
    ...extra,
  };
}

async function signIn(page: Page, email: string, password: string, nextPath: string) {
  await page.goto(`/auth/sign-in?next=${encodeURIComponent(nextPath)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/auth/sign-in"), { timeout: 20_000 }),
    page.getByRole("button", { name: "Đăng nhập" }).click(),
  ]);
}

function taskPayload(targetClassId: string, targetStudentId: string) {
  return {
    classId: targetClassId,
    title: "Security fixture task",
    description: "Dedicated isolated fixture task.",
    startsAt: new Date().toISOString(),
    dueAt: new Date(Date.now() + 86_400_000).toISOString(),
    studentIds: [targetStudentId],
  };
}

test.describe("authenticated tenant boundaries", () => {
  test("teacher reads its class but cannot read or mutate another class", async ({ page }) => {
    test.skip(!has(teacherEmail, teacherPassword, classId, otherClassId, studentId, otherStudentId, behaviorTemplateId, rewardId), "Requires isolated teacher cross-class fixtures.");
    await signIn(page, teacherEmail!, teacherPassword!, "/teacher/dashboard");

    const allowed = await page.request.get(`/api/teacher/students?classId=${classId}`);
    expect(allowed.status()).toBe(200);

    const readForeignClass = await page.request.get(`/api/teacher/students?classId=${otherClassId}`);
    expect(readForeignClass.status()).toBe(403);

    const updateForeignStudent = await page.request.patch(`/api/teacher/students/${otherStudentId}`, {
      headers: mutationHeaders(page),
      data: { classId: otherClassId, fullName: "Should not be written" },
    });
    expect(updateForeignStudent.status()).toBe(403);

    const scoreForeignStudent = await page.request.post("/api/teacher/score", {
      headers: mutationHeaders(page, { "idempotency-key": `e2e-cross-score-${randomUUID()}` }),
      data: { classId: otherClassId, studentIds: [otherStudentId], behaviorTemplateId, reason: "Should be denied" },
    });
    expect(scoreForeignStudent.status()).toBe(403);

    const taskForeignClass = await page.request.post("/api/teacher/tasks", {
      headers: mutationHeaders(page),
      data: taskPayload(otherClassId!, otherStudentId!),
    });
    expect(taskForeignClass.status()).toBe(403);

    const rewardForeignClass = await page.request.post("/api/teacher/rewards/redeem", {
      headers: mutationHeaders(page, { "idempotency-key": `e2e-cross-reward-${randomUUID()}` }),
      data: { classId: otherClassId, studentId: otherStudentId, rewardId },
    });
    expect(rewardForeignClass.status()).toBe(403);
  });

  test("teacher cannot create praise for a student outside its class", async ({ page }) => {
    test.skip(!has(teacherEmail, teacherPassword, otherClassId, otherStudentId), "Requires isolated teacher cross-class fixtures.");
    await signIn(page, teacherEmail!, teacherPassword!, "/teacher/dashboard");
    const response = await page.request.post("/api/teacher/praise", {
      headers: mutationHeaders(page),
      data: {
        classId: otherClassId,
        studentIds: [otherStudentId],
        title: "Should be denied",
        body: "Dedicated security fixture.",
      },
    });
    expect(response.status()).toBe(403);
  });
});

test.describe("authenticated guardian isolation", () => {
  test("guardian can view its child but cannot select another child or fetch foreign media", async ({ page }) => {
    test.skip(!has(guardianEmail, guardianPassword, guardianChildId, guardianOtherStudentId, guardianOtherStudentName, mediaNotAllowedId), "Requires isolated guardian child/media fixtures.");
    await signIn(page, guardianEmail!, guardianPassword!, `/parent/today?studentId=${guardianChildId}`);
    await expect(page).toHaveURL(/\/parent\/today/);
    if (guardianChildName) await expect(page.locator("body")).toContainText(guardianChildName);

    await page.goto(`/parent/profile?studentId=${guardianOtherStudentId}`);
    await expect(page.locator("body")).not.toContainText(guardianOtherStudentName!);

    const foreignMedia = await page.request.get(`/api/media/${mediaNotAllowedId}`);
    expect(foreignMedia.status()).toBe(404);
  });

  test("revoked or canView=false guardian has no child data", async ({ page }) => {
    test.skip(!has(revokedGuardianEmail, revokedGuardianPassword, revokedStudentId, revokedStudentName), "Requires an isolated revoked/canView=false guardian fixture.");
    await signIn(page, revokedGuardianEmail!, revokedGuardianPassword!, `/parent/profile?studentId=${revokedStudentId}`);
    await expect(page.getByRole("heading", { name: "Chưa có dữ liệu" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(revokedStudentName!);
  });
});

test.describe("authenticated admin isolation", () => {
  test("regular teacher cannot access admin data or mutation API", async ({ page }) => {
    test.skip(!has(teacherEmail, teacherPassword, organizationId), "Requires teacher/admin fixture accounts.");
    await signIn(page, teacherEmail!, teacherPassword!, "/admin");
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole("heading", { name: "Không có quyền quản trị" })).toBeVisible();

    const response = await page.request.post("/api/admin", {
      headers: mutationHeaders(page),
      data: { action: "organization.update", organizationId, name: "Should not be written", code: "DENIED" },
    });
    expect(response.status()).toBe(403);
  });

  test("admin cannot mutate another organization", async ({ page }) => {
    test.skip(!has(adminEmail, adminPassword, otherOrganizationId), "Requires an admin and foreign-organization fixture.");
    await signIn(page, adminEmail!, adminPassword!, "/admin");
    const response = await page.request.post("/api/admin", {
      headers: mutationHeaders(page),
      data: { action: "organization.update", organizationId: otherOrganizationId, name: "Should not be written", code: "DENIED" },
    });
    expect(response.status()).toBe(403);
  });
});

test.describe("guardian invitation lifecycle", () => {
  test("valid invitation is one-time and wrong, expired, or revoked tokens are rejected", async ({ page }) => {
    test.skip(!has(guardianEmail, guardianPassword, inviteValidToken, inviteWrongEmailToken, inviteExpiredToken, inviteRevokedToken), "Requires isolated invitation fixtures.");
    await signIn(page, guardianEmail!, guardianPassword!, "/parent/today");

    const valid = await page.request.post("/api/parent/guardians/invitations/accept", {
      headers: mutationHeaders(page),
      data: { token: inviteValidToken },
    });
    expect(valid.status()).toBe(200);

    const replay = await page.request.post("/api/parent/guardians/invitations/accept", {
      headers: mutationHeaders(page),
      data: { token: inviteValidToken },
    });
    expect(replay.status()).toBe(422);

    const wrongEmail = await page.request.post("/api/parent/guardians/invitations/accept", {
      headers: mutationHeaders(page),
      data: { token: inviteWrongEmailToken },
    });
    expect(wrongEmail.status()).toBe(422);

    const expired = await page.request.post("/api/parent/guardians/invitations/accept", {
      headers: mutationHeaders(page),
      data: { token: inviteExpiredToken },
    });
    expect(expired.status()).toBe(422);

    const revoked = await page.request.post("/api/parent/guardians/invitations/accept", {
      headers: mutationHeaders(page),
      data: { token: inviteRevokedToken },
    });
    expect(revoked.status()).toBe(422);
  });

  test("concurrent invitation acceptance claims the token once", async ({ page }) => {
    test.skip(!has(guardianEmail, guardianPassword, inviteConcurrentToken), "Requires an isolated pending invitation fixture.");
    await signIn(page, guardianEmail!, guardianPassword!, "/parent/today");
    const [first, second] = await Promise.all([
      page.request.post("/api/parent/guardians/invitations/accept", { headers: mutationHeaders(page), data: { token: inviteConcurrentToken } }),
      page.request.post("/api/parent/guardians/invitations/accept", { headers: mutationHeaders(page), data: { token: inviteConcurrentToken } }),
    ]);
    expect([first.status(), second.status()].sort()).toEqual([200, 422]);
  });
});

test.describe("score atomicity", () => {
  test("same key retries, concurrent calls, and payload conflicts are safe", async ({ page }) => {
    test.skip(!has(teacherEmail, teacherPassword, classId, studentId, behaviorTemplateId), "Requires isolated score fixtures.");
    await signIn(page, teacherEmail!, teacherPassword!, "/teacher/dashboard");
    const payload = { classId, studentIds: [studentId], behaviorTemplateId, reason: "E2E idempotency" };
    const key = `e2e-score-${randomUUID()}`;
    const [first, concurrent] = await Promise.all([
      page.request.post("/api/teacher/score", { headers: mutationHeaders(page, { "idempotency-key": key }), data: payload }),
      page.request.post("/api/teacher/score", { headers: mutationHeaders(page, { "idempotency-key": key }), data: payload }),
    ]);
    expect(first.status()).toBe(201);
    expect(concurrent.status()).toBe(201);
    await expect(concurrent.json()).resolves.toEqual(await first.json());

    const conflict = await page.request.post("/api/teacher/score", {
      headers: mutationHeaders(page, { "idempotency-key": key }),
      data: { ...payload, reason: "Different payload" },
    });
    expect(conflict.status()).toBe(409);
  });

  test("a partially invalid batch rolls back and can be retried with the same key", async ({ page }) => {
    test.skip(!has(teacherEmail, teacherPassword, classId, studentId, otherStudentId, behaviorTemplateId), "Requires isolated score batch fixtures.");
    await signIn(page, teacherEmail!, teacherPassword!, "/teacher/dashboard");
    const key = `e2e-score-batch-${randomUUID()}`;
    const partial = await page.request.post("/api/teacher/score", {
      headers: mutationHeaders(page, { "idempotency-key": key }),
      data: { classId, studentIds: [studentId, otherStudentId], behaviorTemplateId, reason: "Partial failure" },
    });
    expect(partial.status()).toBe(422);

    const retry = await page.request.post("/api/teacher/score", {
      headers: mutationHeaders(page, { "idempotency-key": key }),
      data: { classId, studentIds: [studentId], behaviorTemplateId, reason: "Partial failure" },
    });
    expect(retry.status()).toBe(201);
  });
});

test.describe("reward atomicity", () => {
  test("same key retry and different payload conflict do not double redeem", async ({ page }) => {
    test.skip(!has(teacherEmail, teacherPassword, classId, studentId, rewardId, otherRewardId), "Requires isolated reward fixtures.");
    await signIn(page, teacherEmail!, teacherPassword!, "/teacher/dashboard");
    const key = `e2e-reward-${randomUUID()}`;
    const payload = { classId, studentId, rewardId };
    const first = await page.request.post("/api/teacher/rewards/redeem", { headers: mutationHeaders(page, { "idempotency-key": key }), data: payload });
    const second = await page.request.post("/api/teacher/rewards/redeem", { headers: mutationHeaders(page, { "idempotency-key": key }), data: payload });
    expect(first.status()).toBe(201);
    expect(second.status()).toBe(201);
    await expect(second.json()).resolves.toEqual(await first.json());

    const conflict = await page.request.post("/api/teacher/rewards/redeem", {
      headers: mutationHeaders(page, { "idempotency-key": key }),
      data: { ...payload, rewardId: otherRewardId },
    });
    expect(conflict.status()).toBe(409);
  });

  test("insufficient balance is rejected without creating a redemption", async ({ page }) => {
    test.skip(!has(teacherEmail, teacherPassword, classId, rewardEmptyStudentId, rewardEmptyRewardId), "Requires an isolated zero-balance reward fixture.");
    await signIn(page, teacherEmail!, teacherPassword!, "/teacher/dashboard");
    const response = await page.request.post("/api/teacher/rewards/redeem", {
      headers: mutationHeaders(page, { "idempotency-key": `e2e-empty-reward-${randomUUID()}` }),
      data: { classId, studentId: rewardEmptyStudentId, rewardId: rewardEmptyRewardId },
    });
    expect(response.status()).toBe(409);
  });

  test("concurrent redemption of one fixture cannot overspend", async ({ page }) => {
    test.skip(!has(teacherEmail, teacherPassword, classId, concurrentRewardStudentId, concurrentRewardId), "Requires a balance-limited concurrent reward fixture.");
    await signIn(page, teacherEmail!, teacherPassword!, "/teacher/dashboard");
    const [first, second] = await Promise.all([
      page.request.post("/api/teacher/rewards/redeem", { headers: mutationHeaders(page, { "idempotency-key": `e2e-concurrent-reward-${randomUUID()}` }), data: { classId, studentId: concurrentRewardStudentId, rewardId: concurrentRewardId } }),
      page.request.post("/api/teacher/rewards/redeem", { headers: mutationHeaders(page, { "idempotency-key": `e2e-concurrent-reward-${randomUUID()}` }), data: { classId, studentId: concurrentRewardStudentId, rewardId: concurrentRewardId } }),
    ]);
    expect([first.status(), second.status()].sort()).toEqual([201, 409]);
  });
});
