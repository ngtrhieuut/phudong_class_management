"use client";

import { FloppyDisk } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ParentRelationship = "Cha" | "Mẹ";

type ParentDraft = {
  guardianId: string | null;
  relationship: ParentRelationship;
  fullName: string;
  phone: string;
  occupation: string;
  birthYear: string;
};

function toParentDraft(
  relationship: ParentRelationship,
  guardian: { id: string; fullName: string; phone: string | null; occupation: string | null; birthYear: number | null } | undefined,
): ParentDraft {
  return {
    guardianId: guardian?.id ?? null,
    relationship,
    fullName: guardian?.fullName ?? "",
    phone: guardian?.phone ?? "",
    occupation: guardian?.occupation ?? "",
    birthYear: guardian?.birthYear ? String(guardian.birthYear) : "",
  };
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "tel";
  inputMode?: "numeric" | "tel" | "text";
}) {
  return (
    <label className="block">
      <span className="font-heading text-xs font-bold text-[var(--on-surface)]">{label}</span>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3 font-body text-sm text-[var(--on-surface)] outline-none ring-[var(--primary)] transition placeholder:text-[var(--outline)] focus:ring-2"
      />
    </label>
  );
}

export function StudentProfileForm({
  classId,
  studentId,
  initial,
  guardians,
}: {
  classId: string;
  studentId: string;
  initial: {
    birthPlace: string | null;
    healthInsuranceNumber: string | null;
    neighborhood: string | null;
    houseNumber: string | null;
    ward: string | null;
  };
  guardians: readonly {
    id: string;
    fullName: string;
    phone: string | null;
    occupation: string | null;
    birthYear: number | null;
    relationship: string;
  }[];
}) {
  const router = useRouter();
  const [birthPlace, setBirthPlace] = useState(initial.birthPlace ?? "");
  const [healthInsuranceNumber, setHealthInsuranceNumber] = useState(initial.healthInsuranceNumber ?? "");
  const [neighborhood, setNeighborhood] = useState(initial.neighborhood ?? "");
  const [houseNumber, setHouseNumber] = useState(initial.houseNumber ?? "");
  const [ward, setWard] = useState(initial.ward ?? "");
  const [parents, setParents] = useState<ParentDraft[]>([
    toParentDraft("Cha", guardians.find((guardian) => guardian.relationship === "Cha")),
    toParentDraft("Mẹ", guardians.find((guardian) => guardian.relationship === "Mẹ")),
  ]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function updateParent(index: number, field: keyof ParentDraft, value: string) {
    setParents((current) => current.map((parent, parentIndex) => (parentIndex === index ? { ...parent, [field]: value } : parent)));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/teacher/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          birthPlace: birthPlace || null,
          healthInsuranceNumber: healthInsuranceNumber || null,
          neighborhood: neighborhood || null,
          houseNumber: houseNumber || null,
          ward: ward || null,
          guardians: parents.map((parent) => ({
            guardianId: parent.guardianId,
            relationship: parent.relationship,
            fullName: parent.fullName || null,
            phone: parent.phone || null,
            occupation: parent.occupation || null,
            birthYear: parent.birthYear ? Number(parent.birthYear) : null,
          })),
        }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Không thể cập nhật thông tin cá nhân.");
      setMessage("Đã lưu thông tin cá nhân và gia đình.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể cập nhật thông tin cá nhân.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow">
      <div>
        <p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Hồ sơ mở rộng</p>
        <h2 className="mt-2 font-heading text-xl font-bold text-[var(--on-surface)]">Thông tin cá nhân & gia đình</h2>
        <p className="mt-1 font-body text-sm leading-6 text-[var(--on-surface-variant)]">Giáo viên có thể cập nhật khi gia đình thay đổi. Các trường để trống sẽ được lưu là chưa cập nhật.</p>
      </div>

      <form className="mt-6 space-y-7" onSubmit={save}>
        <div>
          <h3 className="font-heading text-base font-bold text-[var(--primary)]">Thông tin học sinh</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField label="Mã số BHYT" value={healthInsuranceNumber} onChange={setHealthInsuranceNumber} placeholder="Nhập mã số trên thẻ BHYT" inputMode="text" />
            <TextField label="Nơi sinh" value={birthPlace} onChange={setBirthPlace} placeholder="Ví dụ: Bệnh viện Từ Dũ" />
          </div>
        </div>

        <div>
          <h3 className="font-heading text-base font-bold text-[var(--primary)]">Địa chỉ</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TextField label="Khu phố" value={neighborhood} onChange={setNeighborhood} />
            <TextField label="Số nhà" value={houseNumber} onChange={setHouseNumber} />
            <TextField label="Phường" value={ward} onChange={setWard} />
          </div>
        </div>

        <div>
          <h3 className="font-heading text-base font-bold text-[var(--primary)]">Thông tin cha và mẹ</h3>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {parents.map((parent, index) => (
              <div key={parent.relationship} className="rounded-2xl bg-[var(--surface-low)] p-4">
                <p className="font-heading text-sm font-bold text-[var(--on-surface)]">{parent.relationship}</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <TextField label="Họ và tên" value={parent.fullName} onChange={(value) => updateParent(index, "fullName", value)} />
                  <TextField label="Số điện thoại" type="tel" inputMode="tel" value={parent.phone} onChange={(value) => updateParent(index, "phone", value)} />
                  <TextField label="Nghề nghiệp" value={parent.occupation} onChange={(value) => updateParent(index, "occupation", value)} />
                  <TextField label="Năm sinh" type="number" inputMode="numeric" value={parent.birthYear} onChange={(value) => updateParent(index, "birthYear", value)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--primary)] px-5 font-heading text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[var(--primary-container)] active:scale-95 disabled:opacity-50">
            <FloppyDisk size={18} /> {busy ? "Đang lưu..." : "Lưu thông tin mở rộng"}
          </button>
          {message ? <p role="status" className="font-body text-sm text-[var(--on-surface-variant)]">{message}</p> : null}
        </div>
      </form>
    </section>
  );
}
