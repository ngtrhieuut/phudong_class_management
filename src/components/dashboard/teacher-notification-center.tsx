"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, CheckCircle, Checks, ArrowUpRight } from "@phosphor-icons/react";

import type { TeacherNotification } from "@/lib/teacher/notification-queries";

type TeacherNotificationItem = Omit<TeacherNotification, "readAt" | "createdAt"> & {
  readAt: Date | string | null;
  createdAt: Date | string;
};

function safeInternalLink(deepLink: string | null) {
  return deepLink && deepLink.startsWith("/") && !deepLink.startsWith("//") ? deepLink : null;
}

export function TeacherNotificationCenter({ initialNotifications }: { initialNotifications: TeacherNotification[] }) {
  const [notifications, setNotifications] = useState<TeacherNotificationItem[]>(initialNotifications);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  async function markRead(notificationId: string) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/teacher/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Không thể cập nhật thông báo.");
      setNotifications((current) => current.map((notification) => notification.id === notificationId ? { ...notification, readAt: new Date().toISOString() } : notification));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể cập nhật thông báo.");
    } finally {
      setBusy(false);
    }
  }

  async function markAllRead() {
    if (unreadCount === 0) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/teacher/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Không thể cập nhật thông báo.");
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((notification) => ({ ...notification, readAt })));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể cập nhật thông báo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="font-body text-sm text-[var(--on-surface-variant)]" aria-live="polite">
          {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Bạn đã xem hết thông báo"}
        </span>
        <button type="button" onClick={() => void markAllRead()} disabled={busy || unreadCount === 0} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--surface-low)] px-4 font-heading text-xs font-bold text-[var(--primary)] disabled:opacity-50">
          <Checks size={18} /> Đánh dấu tất cả đã đọc
        </button>
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => {
          const link = safeInternalLink(notification.deepLink);
          return (
            <article key={notification.id} className={`rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow ${notification.readAt ? "" : "ring-2 ring-[var(--primary-fixed)]"}`}>
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--primary-fixed)] text-[var(--primary)]">
                  {notification.readAt ? <CheckCircle size={22} weight="fill" /> : <Bell size={22} weight="fill" />}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-base font-bold text-[var(--on-surface)]">{notification.title}</h2>
                  <p className="mt-1 font-body text-sm leading-6 text-[var(--on-surface-variant)]">{notification.body}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <time className="font-body text-xs text-[var(--outline)]">{new Date(notification.createdAt).toLocaleString("vi-VN")}</time>
                    <div className="flex flex-wrap items-center gap-2">
                      {link ? <Link href={link} className="inline-flex min-h-10 items-center gap-1 rounded-full bg-[var(--primary)] px-3 font-heading text-xs font-bold text-white"><span>Xem liên quan</span><ArrowUpRight size={15} /></Link> : null}
                      {!notification.readAt ? <button type="button" onClick={() => void markRead(notification.id)} disabled={busy} className="min-h-10 rounded-full border border-[var(--outline-variant)] px-3 font-heading text-xs font-bold text-[var(--primary)] disabled:opacity-50">Đã đọc</button> : null}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
        {notifications.length === 0 ? <div className="rounded-[2rem] bg-[var(--surface-lowest)] p-10 text-center soft-shadow"><Bell size={40} className="mx-auto text-[var(--outline)]" /><h1 className="mt-4 font-heading text-2xl font-bold text-[var(--primary)]">Chưa có thông báo</h1><p className="mt-2 font-body text-sm leading-6 text-[var(--on-surface-variant)]">Các cập nhật mới của lớp sẽ xuất hiện tại đây.</p></div> : null}
      </div>
      {message ? <p role="alert" className="mt-4 font-body text-sm text-[var(--needs-improvement)]">{message}</p> : null}
    </div>
  );
}
