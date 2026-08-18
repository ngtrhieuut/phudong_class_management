"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, CaretDown, SpinnerGap } from "@phosphor-icons/react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { avatarPresets, type AvatarGender } from "@/lib/avatar-presets";

export function AvatarImage({
  src,
  alt,
  size = 56,
  className = "rounded-2xl",
}: {
  src?: string | null;
  alt: string;
  size?: number;
  className?: string;
}) {
  if (!src) return null;
  return <Image src={src} alt={alt} width={size} height={size} sizes={`${size}px`} className={`object-cover ${className}`} />;
}

export function AvatarTemplatePicker({
  value,
  gender,
  label = "Đổi avatar",
  fallback,
  size = 64,
  onSelect,
}: {
  value?: string | null;
  gender?: AvatarGender | null;
  label?: string;
  fallback?: ReactNode;
  size?: number;
  onSelect: (url: string) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selected = avatarPresets.find((preset) => preset.url === value);
  const orderedPresets = [...avatarPresets].sort((left, right) => {
    if (gender && left.gender !== right.gender) return left.gender === gender ? -1 : 1;
    return 0;
  });

  useEffect(() => {
    if (!open) return;

    function updateMenuPosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const edge = 16;
      const gap = 12;
      const width = Math.min(352, Math.max(220, window.innerWidth - edge * 2));
      const height = menuRef.current?.getBoundingClientRect().height ?? 280;
      const fitsBelow = rect.bottom + gap + height <= window.innerHeight - edge;
      const top = fitsBelow ? rect.bottom + gap : Math.max(edge, rect.top - gap - height);
      const left = Math.min(Math.max(edge, rect.left), Math.max(edge, window.innerWidth - width - edge));

      setMenuPosition({ top, left, width });
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setMenuPosition(null);
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuPosition(null);
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function selectAvatar(url: string) {
    setBusy(true);
    setError(null);
    try {
      await onSelect(url);
      setMenuPosition(null);
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể đổi avatar.");
    } finally {
      setBusy(false);
    }
  }

  function togglePicker() {
    setMenuPosition(null);
    setOpen((current) => !current);
  }

  return (
    <div className="relative">
      <button
        type="button"
        ref={triggerRef}
        onClick={togglePicker}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        style={{ width: size, height: size }}
        className="group relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.25rem] bg-[var(--primary-fixed)] text-[var(--primary)] transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] active:scale-95"
      >
        {selected ? <AvatarImage src={selected.url} alt={selected.label} size={size} className="h-full w-full rounded-[1.25rem]" /> : fallback ?? <span className="font-heading text-[10px] font-bold">Đổi ảnh</span>}
        <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[var(--primary)] shadow-sm transition group-hover:scale-110"><CaretDown size={12} weight="bold" /></span>
      </button>
      {open && typeof document !== "undefined" ? createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="dialog"
          aria-label="Chọn avatar"
          style={{
            top: menuPosition?.top ?? -10000,
            left: menuPosition?.left ?? -10000,
            width: menuPosition?.width ?? 352,
          }}
          className={`fixed z-50 max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-3xl border border-[var(--surface-high)] bg-[var(--surface-lowest)] p-4 text-left shadow-2xl shadow-blue-900/15 transition-opacity ${menuPosition ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-heading text-sm font-bold text-[var(--on-surface)]">Chọn avatar</p>
              <p className="mt-1 font-body text-xs text-[var(--on-surface-variant)]">5 mẫu nam và 5 mẫu nữ từ thư viện ảnh của lớp.</p>
            </div>
            {busy ? <SpinnerGap size={18} className="animate-spin text-[var(--primary)]" /> : null}
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {orderedPresets.map((preset) => (
              <button
                type="button"
                key={preset.id}
                disabled={busy}
                onClick={() => void selectAvatar(preset.url)}
                aria-label={preset.label}
                className={`relative flex aspect-square items-center justify-center rounded-2xl border-2 bg-[var(--surface-low)] p-1 transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:bg-[var(--primary-fixed)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] active:scale-95 disabled:cursor-wait disabled:opacity-60 ${value === preset.url ? "border-[var(--primary)] ring-2 ring-[var(--primary-fixed)]" : "border-transparent"}`}
              >
                <AvatarImage src={preset.url} alt={preset.label} size={52} className="h-full w-full rounded-xl" />
                {value === preset.url ? <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--positive)] text-white"><Check size={12} weight="bold" /></span> : null}
              </button>
            ))}
          </div>
          {error ? <p role="alert" className="mt-3 rounded-xl bg-[var(--needs-improvement-soft)] px-3 py-2 font-body text-xs text-[var(--needs-improvement)]">{error}</p> : null}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

type StudentAvatarPickerProps = {
  classId: string;
  studentId: string;
  value?: string | null;
  gender?: AvatarGender | null;
  fallback?: ReactNode;
  size?: number;
  onChanged?: (url: string) => void;
};

export function StudentAvatarPicker(props: StudentAvatarPickerProps) {
  // Reset the stateful picker when the persisted server value changes. This
  // avoids copying props into state inside an effect while still allowing the
  // picker to show the new avatar immediately after a successful save.
  return <StudentAvatarPickerState key={`${props.studentId}:${props.value ?? ""}`} {...props} />;
}

function StudentAvatarPickerState({
  classId,
  studentId,
  value,
  gender,
  fallback,
  size,
  onChanged,
}: StudentAvatarPickerProps) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState(value ?? null);

  useEffect(() => {
    function handleAvatarChanged(event: Event) {
      const detail = (event as CustomEvent<{ studentId?: string; url?: string }>).detail;
      if (detail?.studentId === studentId && typeof detail.url === "string") {
        setAvatarUrl(detail.url);
      }
    }

    window.addEventListener("phudong:student-avatar-changed", handleAvatarChanged);
    return () => window.removeEventListener("phudong:student-avatar-changed", handleAvatarChanged);
  }, [studentId]);

  async function saveAvatar(url: string) {
    const response = await fetch(`/api/teacher/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, avatarUrl: url }),
    });
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) throw new Error(payload?.error || "Không thể đổi avatar.");
    setAvatarUrl(url);
    window.dispatchEvent(new CustomEvent("phudong:student-avatar-changed", { detail: { studentId, url } }));
    onChanged?.(url);
    router.refresh();
  }

  return <AvatarTemplatePicker value={avatarUrl} gender={gender} fallback={fallback} size={size} onSelect={saveAvatar} />;
}
