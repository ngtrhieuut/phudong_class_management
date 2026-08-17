"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, FloppyDisk, Key, LockKey, SpinnerGap, UserCircle } from "@phosphor-icons/react";

import { AvatarTemplatePicker } from "@/components/ui/avatar-template-picker";
import { authClient } from "@/lib/auth/client";

type TeacherSettingsProfile = {
  displayName: string;
  email: string;
  avatarUrl: string | null;
};

type TeacherSettingsFormProps = {
  initialProfile: TeacherSettingsProfile;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
}

async function readError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: unknown };
    return typeof payload.error === "string" ? payload.error : fallback;
  } catch {
    return fallback;
  }
}

export function TeacherSettingsForm({ initialProfile }: TeacherSettingsFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialProfile.displayName);
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatarUrl ?? "");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileBusy(true);
    setProfileMessage(null);
    setProfileError(null);

    try {
      const response = await fetch("/api/teacher/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ displayName: displayName.trim(), avatarUrl: avatarUrl.trim() || null }),
      });

      if (!response.ok) {
        setProfileError(await readError(response, "Không thể cập nhật hồ sơ lúc này."));
        return;
      }

      const payload = (await response.json()) as {
        data?: { displayName?: string; avatarUrl?: string | null };
      };
      if (typeof payload.data?.displayName === "string") setDisplayName(payload.data.displayName);
      setAvatarUrl(payload.data?.avatarUrl ?? "");
      setProfileMessage("Hồ sơ đã được cập nhật.");
      router.refresh();
    } catch {
      setProfileError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setProfileBusy(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordBusy(true);
    setPasswordMessage(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu mới và phần xác nhận không khớp.");
      setPasswordBusy(false);
      return;
    }

    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });

      if (result.error) {
        setPasswordError("Không thể đổi mật khẩu. Hãy kiểm tra mật khẩu hiện tại và thử lại.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Mật khẩu đã được đổi. Các phiên đăng nhập khác đã được đăng xuất.");
    } catch {
      setPasswordError("Không thể kết nối dịch vụ xác thực. Kiểm tra cấu hình Neon Auth.");
    } finally {
      setPasswordBusy(false);
    }
  }

  const previewName = displayName.trim() || initialProfile.displayName;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-[var(--surface-lowest)] p-6 soft-shadow sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <AvatarTemplatePicker
            size={80}
            value={avatarUrl.trim() || null}
            label="Đổi avatar giáo viên"
            fallback={<span className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-[var(--primary-fixed)] font-heading text-2xl font-bold text-[var(--primary)] ring-4 ring-[var(--surface-low)]">{initials(previewName)}</span>}
            onSelect={(url) => setAvatarUrl(url)}
          />
          <div>
            <p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Thông tin cá nhân</p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-[var(--on-surface)]">Hồ sơ giáo viên</h2>
            <p className="mt-1 font-body text-sm text-[var(--on-surface-variant)]">Email đăng nhập: {initialProfile.email || "Chưa cập nhật"}</p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="mt-7 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block font-heading text-sm font-bold text-[var(--on-surface)]">Tên hiển thị</span>
            <input
              name="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              type="text"
              autoComplete="name"
              required
              minLength={1}
              maxLength={100}
              className="min-h-12 w-full rounded-2xl border-2 border-transparent bg-[var(--surface-low)] px-4 font-body text-[var(--on-surface)] outline-none transition placeholder:text-[var(--outline)] focus:border-[var(--primary)] focus:bg-[var(--surface-lowest)]"
            />
          </label>
          <div className="sm:col-span-2 rounded-2xl bg-[var(--surface-low)] px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-body text-sm text-[var(--on-surface-variant)]">Chọn một trong 10 avatar icon nội bộ để tránh phụ thuộc ảnh bên ngoài.</p>
              <button type="button" onClick={() => setAvatarUrl("")} className="font-heading text-xs font-bold text-[var(--primary)] underline underline-offset-4 transition hover:text-[var(--primary-container)]">Dùng chữ viết tắt</button>
            </div>
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={profileBusy}
              aria-busy={profileBusy}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--primary)] px-5 font-heading text-sm font-bold text-white transition hover:bg-[var(--primary-container)] disabled:cursor-wait disabled:opacity-70"
            >
              {profileBusy ? <SpinnerGap size={19} className="animate-spin" /> : <FloppyDisk size={19} />}
              {profileBusy ? "Đang lưu..." : "Lưu hồ sơ"}
            </button>
            <Link href="/teacher/dashboard" className="inline-flex min-h-12 items-center rounded-full px-4 font-heading text-sm font-bold text-[var(--primary)] transition hover:bg-[var(--surface-low)]">
              Quay lại dashboard
            </Link>
          </div>
          {profileError ? <p role="alert" className="sm:col-span-2 rounded-2xl bg-[var(--needs-improvement-soft)] px-4 py-3 font-body text-sm leading-5 text-[var(--needs-improvement)]">{profileError}</p> : null}
          {profileMessage ? <p role="status" className="sm:col-span-2 flex items-center gap-2 rounded-2xl bg-[var(--positive-soft)] px-4 py-3 font-body text-sm leading-5 text-[var(--positive)]"><CheckCircle size={18} weight="fill" /> {profileMessage}</p> : null}
        </form>
      </section>

      <section className="rounded-[2rem] bg-[var(--surface-lowest)] p-6 soft-shadow sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--primary-fixed)] text-[var(--primary)]"><LockKey size={22} weight="fill" /></span>
          <div>
            <p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Bảo mật tài khoản</p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-[var(--on-surface)]">Đổi mật khẩu</h2>
            <p className="mt-2 font-body text-sm leading-6 text-[var(--on-surface-variant)]">Dùng mật khẩu hiện tại để đặt mật khẩu mới. Sau khi đổi, các phiên đăng nhập khác sẽ bị thu hồi.</p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="mt-7 grid gap-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-2 block font-heading text-sm font-bold text-[var(--on-surface)]">Mật khẩu hiện tại</span>
            <input name="currentPassword" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} type="password" autoComplete="current-password" required minLength={8} maxLength={128} className="min-h-12 w-full rounded-2xl border-2 border-transparent bg-[var(--surface-low)] px-4 font-body text-[var(--on-surface)] outline-none transition focus:border-[var(--primary)] focus:bg-[var(--surface-lowest)]" />
          </label>
          <label className="block">
            <span className="mb-2 block font-heading text-sm font-bold text-[var(--on-surface)]">Mật khẩu mới</span>
            <input name="newPassword" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" autoComplete="new-password" required minLength={8} maxLength={128} placeholder="Tối thiểu 8 ký tự" className="min-h-12 w-full rounded-2xl border-2 border-transparent bg-[var(--surface-low)] px-4 font-body text-[var(--on-surface)] outline-none transition placeholder:text-[var(--outline)] focus:border-[var(--primary)] focus:bg-[var(--surface-lowest)]" />
          </label>
          <label className="block">
            <span className="mb-2 block font-heading text-sm font-bold text-[var(--on-surface)]">Xác nhận mật khẩu mới</span>
            <input name="confirmPassword" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" autoComplete="new-password" required minLength={8} maxLength={128} placeholder="Nhập lại mật khẩu mới" className="min-h-12 w-full rounded-2xl border-2 border-transparent bg-[var(--surface-low)] px-4 font-body text-[var(--on-surface)] outline-none transition placeholder:text-[var(--outline)] focus:border-[var(--primary)] focus:bg-[var(--surface-lowest)]" />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={passwordBusy} aria-busy={passwordBusy} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--primary)] px-5 font-heading text-sm font-bold text-white transition hover:bg-[var(--primary-container)] disabled:cursor-wait disabled:opacity-70">
              {passwordBusy ? <SpinnerGap size={19} className="animate-spin" /> : <Key size={19} />}
              {passwordBusy ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}
            </button>
          </div>
          {passwordError ? <p role="alert" className="sm:col-span-2 rounded-2xl bg-[var(--needs-improvement-soft)] px-4 py-3 font-body text-sm leading-5 text-[var(--needs-improvement)]">{passwordError}</p> : null}
          {passwordMessage ? <p role="status" className="sm:col-span-2 flex items-center gap-2 rounded-2xl bg-[var(--positive-soft)] px-4 py-3 font-body text-sm leading-5 text-[var(--positive)]"><CheckCircle size={18} weight="fill" /> {passwordMessage}</p> : null}
        </form>
      </section>

      <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-low)] p-4 font-body text-sm leading-6 text-[var(--on-surface-variant)]">
        <UserCircle size={23} className="shrink-0 text-[var(--primary)]" />
        <p>Neon Auth quản lý email, mật khẩu và session; Phù Đổng chỉ lưu thông tin hiển thị cần thiết cho ứng dụng.</p>
      </div>
    </div>
  );
}
