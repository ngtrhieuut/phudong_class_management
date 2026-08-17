"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, Eye, EyeSlash, SpinnerGap } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";
import { signUpInputSchema } from "@/lib/validation";

export function SignUpForm({ callbackPath = "/teacher/dashboard" }: { callbackPath?: string }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const validation = signUpInputSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Vui lòng kiểm tra lại thông tin đăng ký.");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await authClient.signUp.email({
        name: validation.data.name,
        email: validation.data.email,
        password: validation.data.password,
        callbackURL: callbackPath,
      });

      if (result.error) {
        setError("Không thể tạo tài khoản. Email có thể đã được sử dụng hoặc thông tin chưa hợp lệ.");
        return;
      }

      if (result.data?.token) {
        router.replace(callbackPath);
        router.refresh();
        return;
      }

      setSuccess(true);
    } catch {
      setError("Không thể kết nối dịch vụ xác thực. Kiểm tra cấu hình Neon Auth.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div role="status" className="rounded-3xl bg-[var(--positive-soft)] p-5 text-[var(--on-surface)]">
        <div className="flex items-start gap-3">
          <CheckCircle size={25} weight="fill" className="mt-0.5 shrink-0 text-[var(--positive)]" />
          <div>
            <h3 className="font-heading text-lg font-bold">Đăng ký thành công</h3>
            <p className="mt-2 font-body text-sm leading-6 text-[var(--on-surface-variant)]">
              Nếu hệ thống yêu cầu xác minh email, hãy kiểm tra hộp thư trước khi đăng nhập.
            </p>
          </div>
        </div>
        <Link
          href={`/auth/sign-in?next=${encodeURIComponent(callbackPath)}`}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 font-heading text-sm font-bold text-white transition hover:bg-[var(--primary-container)]"
        >
          Đến trang đăng nhập <ArrowRight size={18} weight="bold" />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block">
        <span className="mb-2 block font-heading text-sm font-bold text-[var(--on-surface)]">Họ và tên</span>
        <input
          name="name"
          type="text"
          autoComplete="name"
          required
          minLength={1}
          maxLength={100}
          placeholder="Nguyễn Thị Mai"
          className="min-h-12 w-full rounded-2xl border-2 border-transparent bg-[var(--surface-low)] px-4 font-body text-[var(--on-surface)] outline-none transition placeholder:text-[var(--outline)] focus:border-[var(--primary)] focus:bg-[var(--surface-lowest)]"
        />
      </label>
      <label className="block">
        <span className="mb-2 block font-heading text-sm font-bold text-[var(--on-surface)]">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          maxLength={320}
          placeholder="co.giao@example.com"
          className="min-h-12 w-full rounded-2xl border-2 border-transparent bg-[var(--surface-low)] px-4 font-body text-[var(--on-surface)] outline-none transition placeholder:text-[var(--outline)] focus:border-[var(--primary)] focus:bg-[var(--surface-lowest)]"
        />
      </label>
      <label className="block">
        <span className="mb-2 block font-heading text-sm font-bold text-[var(--on-surface)]">Mật khẩu</span>
        <span className="relative block">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            placeholder="Tối thiểu 8 ký tự"
            className="min-h-12 w-full rounded-2xl border-2 border-transparent bg-[var(--surface-low)] px-4 pr-12 font-body text-[var(--on-surface)] outline-none transition placeholder:text-[var(--outline)] focus:border-[var(--primary)] focus:bg-[var(--surface-lowest)]"
          />
          <button
            type="button"
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[var(--on-surface-variant)] transition hover:bg-[var(--surface-container)]"
          >
            {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
          </button>
        </span>
      </label>
      <label className="block">
        <span className="mb-2 block font-heading text-sm font-bold text-[var(--on-surface)]">Nhập lại mật khẩu</span>
        <span className="relative block">
          <input
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            placeholder="Nhập lại mật khẩu"
            className="min-h-12 w-full rounded-2xl border-2 border-transparent bg-[var(--surface-low)] px-4 pr-12 font-body text-[var(--on-surface)] outline-none transition placeholder:text-[var(--outline)] focus:border-[var(--primary)] focus:bg-[var(--surface-lowest)]"
          />
          <button
            type="button"
            aria-label={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
            onClick={() => setShowConfirmPassword((current) => !current)}
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[var(--on-surface-variant)] transition hover:bg-[var(--surface-container)]"
          >
            {showConfirmPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
          </button>
        </span>
      </label>
      {error ? (
        <p role="alert" className="rounded-2xl bg-[var(--needs-improvement-soft)] px-4 py-3 font-body text-sm leading-5 text-[var(--needs-improvement)]">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 font-heading text-sm font-bold text-white shadow-lg shadow-blue-900/10 transition hover:bg-[var(--primary-container)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
      >
        {isSubmitting ? <SpinnerGap size={20} className="animate-spin" /> : <ArrowRight size={20} weight="bold" />}
        {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
      </button>
    </form>
  );
}
