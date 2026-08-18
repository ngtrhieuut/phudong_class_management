import { requireUserSession } from "@/lib/auth/server";
import { ensureAppUser } from "@/lib/auth/app-user";
import { getOnboardingState } from "@/lib/onboarding/service";
import { TeacherOnboardingForm } from "./teacher-onboarding-form";

export const dynamic = "force-dynamic";

export default async function TeacherOnboardingPage() {
  const session = await requireUserSession();
  const user = await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name, image: session.user.image });
  const state = await getOnboardingState(user.id);
  if (state.completed) {
    return <main className="min-h-[100dvh] bg-[var(--surface)] p-6"><div className="mx-auto max-w-xl rounded-[2rem] bg-[var(--surface-lowest)] p-8 text-center soft-shadow"><h1 className="font-heading text-3xl font-bold text-[var(--primary)]">Lớp học đã sẵn sàng</h1><p className="mt-3 font-body leading-7 text-[var(--on-surface-variant)]">Bạn đã hoàn tất khởi tạo lớp. Hãy quay về dashboard để bắt đầu quản lý.</p><a href="/teacher/dashboard" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--primary)] px-5 font-heading text-sm font-bold text-white">Mở dashboard</a></div></main>;
  }
  return <TeacherOnboardingForm initialOrganizationName={state.organization?.organizationName ?? user.displayName} />;
}
