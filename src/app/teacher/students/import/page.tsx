import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { StudentImportPanel } from "@/components/dashboard/student-import-panel";
import { ensureAppUser } from "@/lib/auth/app-user";
import { requireUserSession } from "@/lib/auth/server";
import { getTeacherClass } from "@/lib/classroom/queries";

export const dynamic = "force-dynamic";

export default async function StudentImportPage() {
  const session = await requireUserSession();
  await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
  const classContext = await getTeacherClass(session.user.id);

  return (
    <AppShell active="Học sinh">
      <div className="mx-auto max-w-[1480px] px-5 py-7 sm:px-8 lg:px-10">
        <Link href="/teacher/students" className="inline-flex min-h-11 items-center font-heading text-sm font-bold text-[var(--primary)] hover:underline">← Quay lại danh sách</Link>
        {classContext ? (
          <div className="mt-5"><StudentImportPanel context={{ organizationId: classContext.organizationId, schoolYearId: classContext.schoolYearId, classId: classContext.id, className: classContext.name }} /></div>
        ) : (
          <div className="mt-5 rounded-[1.5rem] bg-[var(--surface-lowest)] p-8 text-center soft-shadow"><h1 className="font-heading text-2xl font-bold text-[var(--primary)]">Chưa có lớp được phân công</h1><p className="mt-2 font-body text-sm text-[var(--on-surface-variant)]">Tài khoản chưa có quyền teacher trên lớp nào.</p></div>
        )}
      </div>
    </AppShell>
  );
}
