import Link from "next/link";
import { ArrowLeft, ShieldCheck, Star } from "@phosphor-icons/react/dist/ssr";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <main className="min-h-[100dvh] bg-[var(--surface)] px-5 py-8 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/80 bg-[var(--surface-lowest)] shadow-2xl shadow-blue-900/10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative hidden overflow-hidden bg-[var(--primary)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
            <div className="absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-[var(--secondary-container)]/30" />
            <div className="relative">
              <div className="mb-12 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <Star size={27} weight="fill" />
                </span>
                <div>
                  <p className="font-heading text-sm font-bold tracking-wide">PHÙ ĐỔNG</p>
                  <p className="font-body text-sm text-white/75">Class Management</p>
                </div>
              </div>
              <h1 className="max-w-sm font-heading text-4xl font-bold leading-tight">
                Mỗi ngày một dấu mốc tiến bộ.
              </h1>
              <p className="mt-5 max-w-sm font-body text-base leading-7 text-white/80">
                Ghi nhận tích cực để lớp học cùng lớn lên trong sự tin tưởng.
              </p>
            </div>
            <div className="relative flex items-center gap-3 rounded-2xl bg-white/10 p-4">
              <ShieldCheck size={24} weight="fill" />
              <p className="font-body text-sm leading-5 text-white/85">
                Dữ liệu lớp học được bảo vệ theo từng vai trò.
              </p>
            </div>
          </div>
          <div className="p-6 sm:p-10 lg:p-14">
            <Link
              href="/"
              className="mb-12 inline-flex min-h-11 items-center gap-2 font-heading text-sm font-bold text-[var(--primary)] transition hover:gap-3"
            >
              <ArrowLeft size={18} weight="bold" /> Về trang giới thiệu
            </Link>
            <div className="mb-8">
              <p className="font-heading text-sm font-bold uppercase tracking-[0.16em] text-[var(--tertiary)]">Khu vực bảo mật</p>
              <h2 className="mt-3 font-heading text-3xl font-bold text-[var(--on-surface)]">Chào mừng trở lại</h2>
              <p className="mt-3 font-body leading-7 text-[var(--on-surface-variant)]">
                Đăng nhập để mở dashboard lớp học của bạn.
              </p>
            </div>
            <SignInForm />
            <p className="mt-8 text-center font-body text-xs leading-5 text-[var(--on-surface-variant)]">
              Authentication đang dùng Managed Better Auth của Neon. Tài khoản và session không nằm trong client database.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
