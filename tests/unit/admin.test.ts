import { describe, expect, it } from "vitest";

import { parseAdminAction } from "@/lib/admin/service";

const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";

describe("admin action validation", () => {
  it("accepts tenant-scoped class and member operations", () => {
    expect(parseAdminAction({
      organizationId,
      action: "class.save",
      schoolYearId: "33333333-3333-4333-8333-333333333333",
      name: "Lớp 1/1",
      grade: 1,
      teacherId: userId,
      archived: false,
    }).success).toBe(true);
    expect(parseAdminAction({ organizationId, action: "member.invite", email: "teacher@example.com", role: "teacher" }).success).toBe(true);
  });

  it("requires explicit confirmations for destructive actions", () => {
    expect(parseAdminAction({ organizationId, action: "member.revoke", userId }).success).toBe(false);
    expect(parseAdminAction({ organizationId, action: "member.revoke", userId, confirmation: "REVOKE" }).success).toBe(true);
    expect(parseAdminAction({ organizationId, action: "school-year.archive", id: userId, confirmation: "ARCHIVE" }).success).toBe(true);
  });
});
