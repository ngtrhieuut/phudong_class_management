"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, EnvelopeSimple, SpinnerGap } from "@phosphor-icons/react";

import { authClient } from "@/lib/auth/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const redirectTo = new URL("/auth/reset-password", window.location.origin).toString();
      const result = await authClient.requestPasswordReset({ email: email.trim(), redirectTo });

      if (result.error) {
        setError("Không thể gửi email khôi phục lúc này. Vui lòng kiểm tra email và thử lại.");
        return;
      }

      setSent(true);
    } catch {
      setError("Không thể kết nối dịch vụ xác thực. Kiểm tra cấu hình Neon Auth.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="rounded-3xl bg-[var(--positive-soft)] p-5 text-[var(--on-surface)]">
        <div className="flex items-start gap-3">
          <CheckCircle size={25} weight="fill" className="mt-0.5 shrink-0 text-[var(--positive)]" />
          <div>
            <h3 className="font-heading text-lg font-bold">Đã gửi yêu cầu</h3>
            <p className="mt-2 font-body text-sm leading-6 text-[var(--on-surface-variant)]">
              Nếu email này có tài khoản Phù Đổng, bạn sẽ nhận được liên kết đặt lại mật khẩu. Hãy kiểm tra cả thư mục spam.
            </p>
          </div>
        </div>
        <Link href="/auth/sign-in" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 font-heading text-sm font-bold text-white transition hover:bg-[var(--primary-container)]">
          Quay lại đăng nhập <ArrowRight size={18} weight="bold" />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block">
        <span className="mb-2 block font-heading text-sm font-bold text-[var(--on-surface)]">Email tài khoản</span>
        <span className="relative block">
          <EnvelopeSimple size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)]" />
          <input
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            maxLength={320}
            placeholder="co.giao@example.com"
            className="min-h-12 w-full rounded-2xl border-2 border-transparent bg-[var(--surface-low)] pl-12 pr-4 font-body text-[var(--on-surface)] outline-none transition placeholder:text-[var(--outline)] focus:border-[var(--primary)] focus:bg-[var(--surface-lowest)]"
          />
        </span>
      </label>
      {error ? <p role="alert" className="rounded-2xl bg-[var(--needs-improvement-soft)] px-4 py-3 font-body text-sm leading-5 text-[var(--needs-improvement)]">{error}</p> : null}
      <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 font-heading text-sm font-bold text-white shadow-lg shadow-blue-900/10 transition hover:bg-[var(--primary-container)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70">
        {isSubmitting ? <SpinnerGap size={20} className="animate-spin" /> : <ArrowRight size={20} weight="bold" />}
        {isSubmitting ? "Đang gửi email..." : "Gửi liên kết khôi phục"}
      </button>
      <p className="text-center font-body text-sm text-[var(--on-surface-variant)]">
        Nhớ mật khẩu rồi? <Link href="/auth/sign-in" className="font-heading font-bold text-[var(--primary)] underline decoration-[var(--primary-fixed)] underline-offset-4">Đăng nhập</Link>
      </p>
    </form>
  );
}
