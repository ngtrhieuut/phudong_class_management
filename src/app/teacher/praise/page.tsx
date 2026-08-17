import { Sparkle } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/layout/app-shell";
import { recentPraise } from "@/lib/demo-data";

export default function TeacherPraisePage() {
  return (
    <AppShell active="Góc tuyên dương">
      <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8">
        <p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Lan tỏa điều tốt</p>
        <h1 className="mt-2 font-heading text-4xl font-bold text-[var(--primary)]">Góc tuyên dương</h1>
        <p className="mt-3 max-w-xl font-body text-base leading-7 text-[var(--on-surface-variant)]">Lưu lại những khoảnh khắc đáng nhớ để học sinh và phụ huynh cùng nhìn thấy tiến bộ.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {recentPraise.map((item) => (
            <article key={item.id} className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--secondary-container)] text-[var(--secondary)]"><Sparkle size={24} weight="fill" /></span>
                <div>
                  <h2 className="font-heading text-xl font-bold text-[var(--on-surface)]">{item.student}</h2>
                  <p className="mt-1 font-body text-sm text-[var(--on-surface-variant)]">{item.behavior} · {item.time}</p>
                </div>
              </div>
              {item.body ? <p className="mt-5 font-body leading-7 text-[var(--on-surface-variant)]">{item.body}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
