"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeSlash, SpinnerGap } from "@phosphor-icons/react";
import { authClient } from "@/lib/auth/client";

export function SignInForm({ callbackPath = "/teacher/dashboard" }: { callbackPath?: string }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const result = await authClient.signIn.email({
        email,
        password,
        callbackURL: callbackPath,
      });

      if (result.error) {
        setError(result.error.message || "Đăng nhập chưa thành công. Vui lòng thử lại.");
        return;
      }

      router.push(callbackPath);
      router.refresh();
    } catch {
      setError("Không thể kết nối dịch vụ xác thực. Kiểm tra cấu hình Neon Auth.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block">
        <span className="mb-2 block font-heading text-sm font-bold text-[var(--on-surface)]">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
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
            autoComplete="current-password"
            required
            minLength={8}
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
      <div className="-mt-2 text-right">
        <Link
          href="/auth/forgot-password"
          className="font-heading text-sm font-bold text-[var(--primary)] underline decoration-[var(--primary-fixed)] underline-offset-4 transition hover:text-[var(--primary-container)]"
        >
          Quên mật khẩu?
        </Link>
      </div>
      {error ? (
        <p role="alert" className="rounded-2xl bg-[var(--needs-improvement-soft)] px-4 py-3 font-body text-sm leading-5 text-[var(--needs-improvement)]">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 font-heading text-sm font-bold text-white shadow-lg shadow-blue-900/10 transition hover:bg-[var(--primary-container)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
      >
        {isSubmitting ? <SpinnerGap size={20} className="animate-spin" /> : <ArrowRight size={20} weight="bold" />}
        {isSubmitting ? "Đang kiểm tra..." : "Đăng nhập"}
      </button>
    </form>
  );
}
