import { describe, expect, it } from "vitest";

import { signUpInputSchema } from "@/lib/validation";

describe("sign-up validation", () => {
  it("accepts a valid account payload", () => {
    const result = signUpInputSchema.safeParse({
      name: "Nguyễn Thị Mai",
      email: "mai@example.com",
      password: "matkhau-an-toan",
      confirmPassword: "matkhau-an-toan",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a weak or mismatched password", () => {
    const result = signUpInputSchema.safeParse({
      name: "Mai",
      email: "mai@example.com",
      password: "short",
      confirmPassword: "different",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual(
        expect.arrayContaining(["Mật khẩu cần có ít nhất 8 ký tự.", "Mật khẩu xác nhận không khớp."]),
      );
    }
  });

  it("rejects malformed email addresses", () => {
    const result = signUpInputSchema.safeParse({
      name: "Mai",
      email: "not-an-email",
      password: "matkhau-an-toan",
      confirmPassword: "matkhau-an-toan",
    });

    expect(result.success).toBe(false);
  });
});
