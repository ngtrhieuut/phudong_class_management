import { describe, expect, it } from "vitest";

import { getTeacherNotificationContent } from "../../src/lib/teacher/notification-service";

const classId = "00000000-0000-4000-8000-000000000001";

describe("teacher notification content", () => {
  it("keeps task-created notifications generic and class-scoped", () => {
    expect(getTeacherNotificationContent("task_created", classId)).toEqual({
      type: "task_created",
      title: "Nhiệm vụ mới trong lớp",
      body: "Một nhiệm vụ mới đã được tạo trong lớp bạn phụ trách.",
      deepLink: `/teacher/tasks?classId=${classId}`,
    });
  });

  it("does not include student or reward details in redemption notifications", () => {
    const notification = getTeacherNotificationContent("reward_redemption_requested", classId);

    expect(notification).toEqual({
      type: "reward_redemption_requested",
      title: "Có yêu cầu đổi quà mới",
      body: "Một yêu cầu đổi phần thưởng đang chờ giáo viên xử lý.",
      deepLink: `/teacher/rewards?classId=${classId}`,
    });
    expect(`${notification.title} ${notification.body}`).not.toMatch(/student|học sinh|email|số sao/i);
  });
});
