import { redirect } from "next/navigation";
import { ShieldCheck, UserPlus } from "@phosphor-icons/react/dist/ssr";

import { getUserSession } from "@/lib/auth/server";
import { ParentInvitationAccept } from "@/components/parent/parent-invitation-accept";

export const dynamic = "force-dynamic";

export default async function ParentInvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token?.trim() ?? "";
  if (!token || token.length < 32 || token.length > 256) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--surface)] p-5">
        <section className="w-full max-w-lg rounded-[2rem] bg-[var(--surface-lowest)] p-8 text-center soft-shadow">
          <ShieldCheck size={44} className="mx-auto text-[var(--needs-improvement)]" />
          <h1 className="mt-4 font-heading text-2xl font-bold text-[var(--primary)]">Lời mời không hợp lệ</h1>
          <p className="mt-3 font-body text-sm leading-6 text-[var(--on-surface-variant)]">Liên kết lời mời bị thiếu hoặc đã bị hỏng. Hãy xin giáo viên tạo một lời mời mới.</p>
        </section>
      </main>
    );
  }

  const session = await getUserSession();
  if (!session?.user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(`/parent/invite?token=${token}`)}`);
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--surface)] p-5">
      <section className="w-full max-w-lg rounded-[2rem] bg-[var(--surface-lowest)] p-8 soft-shadow sm:p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-fixed)] text-[var(--primary)]"><UserPlus size={28} weight="fill" /></div>
        <p className="mt-8 font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Lời mời an toàn</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-[var(--primary)]">Kết nối hồ sơ phụ huynh</h1>
        <p className="mt-3 font-body text-sm leading-6 text-[var(--on-surface-variant)]">Bạn đang đăng nhập bằng <strong>{session.user.email}</strong>. Chỉ xác nhận nếu đây là email bạn dùng với giáo viên của con.</p>
        <ParentInvitationAccept token={token} />
      </section>
    </main>
  );
}
