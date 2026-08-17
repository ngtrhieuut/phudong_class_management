import type { ReactNode } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";

export function AppShell({
  active,
  children,
}: {
  active: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] bg-[var(--surface)]">
      <Sidebar active={active} />
      <div className="min-w-0 flex-1">
        <TopBar />
        <main className="pb-24 md:pb-8">{children}</main>
      </div>
      <MobileNav active={active} />
    </div>
  );
}
