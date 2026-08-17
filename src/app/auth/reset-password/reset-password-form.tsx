"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, Eye, EyeSlash, SpinnerGap } from "@phosphor-icons/react";

import { authClient } from "@/lib/auth/client";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!token) {
      setError("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
      setIsSubmitting(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu mới và phần xác nhận không khớp.");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await authClient.resetPassword({ newPassword, token });
      if (result.error) {
        setError("Không thể đặt lại mật khẩu. Liên kết có thể đã hết hạn; hãy yêu cầu một email mới.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Không thể kết nối dịch vụ xác thực. Kiểm tra cấu hình Neon Auth.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div role="alert" className="rounded-3xl bg-[var(--needs-improvement-soft)] p-5 text-sm leading-6 text-[var(--needs-improvement)]">
        Liên kết đặt lại mật khẩu không có token hợp lệ hoặc đã bị thiếu.
        <Link href="/auth/forgot-password" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--primary)] px-5 font-heading text-sm font-bold text-white transition hover:bg-[var(--primary-container)]">Yêu cầu liên kết mới</Link>
      </div>
    );
  }

  if (success) {
    return (
      <div role="status" className="rounded-3xl bg-[var(--positive-soft)] p-5 text-[var(--on-surface)]">
        <div className="flex items-start gap-3">
          <CheckCircle size={25} weight="fill" className="mt-0.5 shrink-0 text-[var(--positive)]" />
          <div><h3 className="font-heading text-lg font-bold">Đặt lại mật khẩu thành công</h3><p className="mt-2 font-body text-sm leading-6 text-[var(--on-surface-variant)]">Bạn có thể dùng mật khẩu mới để đăng nhập vào Phù Đổng.</p></div>
        </div>
        <Link href="/auth/sign-in" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 font-heading text-sm font-bold text-white transition hover:bg-[var(--primary-container)]">Đến trang đăng nhập <ArrowRight size={18} weight="bold" /></Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block">
        <span className="mb-2 block font-heading text-sm font-bold text-[var(--on-surface)]">Mật khẩu mới</span>
        <span className="relative block">
          <input name="newPassword" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} placeholder="Tối thiểu 8 ký tự" className="min-h-12 w-full rounded-2xl border-2 border-transparent bg-[var(--surface-low)] px-4 pr-12 font-body text-[var(--on-surface)] outline-none transition placeholder:text-[var(--outline)] focus:border-[var(--primary)] focus:bg-[var(--surface-lowest)]" />
          <button type="button" aria-label={showPassword ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"} onClick={() => setShowPassword((current) => !current)} className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[var(--on-surface-variant)] transition hover:bg-[var(--surface-container)]">{showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}</button>
        </span>
      </label>
      <label className="block">
        <span className="mb-2 block font-heading text-sm font-bold text-[var(--on-surface)]">Xác nhận mật khẩu mới</span>
        <span className="relative block">
          <input name="confirmPassword" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} placeholder="Nhập lại mật khẩu mới" className="min-h-12 w-full rounded-2xl border-2 border-transparent bg-[var(--surface-low)] px-4 pr-12 font-body text-[var(--on-surface)] outline-none transition placeholder:text-[var(--outline)] focus:border-[var(--primary)] focus:bg-[var(--surface-lowest)]" />
          <button type="button" aria-label={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"} onClick={() => setShowConfirmPassword((current) => !current)} className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[var(--on-surface-variant)] transition hover:bg-[var(--surface-container)]">{showConfirmPassword ? <EyeSlash size={20} /> : <Eye size={20} />}</button>
        </span>
      </label>
      {error ? <p role="alert" className="rounded-2xl bg-[var(--needs-improvement-soft)] px-4 py-3 font-body text-sm leading-5 text-[var(--needs-improvement)]">{error}</p> : null}
      <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 font-heading text-sm font-bold text-white shadow-lg shadow-blue-900/10 transition hover:bg-[var(--primary-container)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70">
        {isSubmitting ? <SpinnerGap size={20} className="animate-spin" /> : <ArrowRight size={20} weight="bold" />}
        {isSubmitting ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
      </button>
    </form>
  );
}
