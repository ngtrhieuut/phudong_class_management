import { describe, expect, it } from "vitest";

import { OnboardingError, parseTeacherOnboardingInput } from "@/lib/onboarding/service";

const baseInput = {
  organization: { name: "Trường Phù Đổng", code: "PHU-DONG" },
  schoolYear: { name: "2026-2027", startsAt: "2026-08-01", endsAt: "2027-05-31" },
  classroom: { name: "Lớp 5/1", grade: 5 },
  students: [],
};

describe("teacher onboarding validation", () => {
  it("accepts the supported primary-school grades 1 through 5", () => {
    expect(parseTeacherOnboardingInput(baseInput).classroom.grade).toBe(5);
    expect(parseTeacherOnboardingInput({ ...baseInput, classroom: { ...baseInput.classroom, grade: 1 } }).classroom.grade).toBe(1);
  });

  it("rejects grades outside the product scope", () => {
    expect(() => parseTeacherOnboardingInput({ ...baseInput, classroom: { ...baseInput.classroom, grade: 6 } })).toThrow(OnboardingError);
  });
});
