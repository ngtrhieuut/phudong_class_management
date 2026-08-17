import type { ReactNode } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { ClassSwitcher } from "@/components/layout/class-switcher";

export function AppShell({
  active,
  children,
  classOptions,
  selectedClassId,
  classSwitcherPath,
  teacherName,
  className,
  schoolYearName,
}: {
  active: string;
  children: ReactNode;
  classOptions?: readonly { id: string; name: string; schoolYearName: string }[];
  selectedClassId?: string;
  classSwitcherPath?: string;
  teacherName?: string;
  className?: string;
  schoolYearName?: string;
}) {
  const selectedClass = classOptions?.find((option) => option.id === selectedClassId) ?? classOptions?.[0];
  const selectedClassName = className ?? selectedClass?.name;
  const selectedSchoolYearName = schoolYearName ?? selectedClass?.schoolYearName;
  return (
    <div className="flex min-h-[100dvh] bg-[var(--surface)]">
      <Sidebar active={active} teacherName={teacherName} className={selectedClassName} schoolYearName={selectedSchoolYearName} />
      <div className="min-w-0 flex-1">
        <TopBar teacherName={teacherName} />
        {classOptions && classOptions.length > 1 ? <div className="border-b border-[var(--surface-high)] bg-[var(--surface)] px-5 py-2 sm:px-8"><ClassSwitcher options={classOptions} selectedId={selectedClassId} basePath={classSwitcherPath} /></div> : null}
        <main className="pb-24 md:pb-8">{children}</main>
      </div>
      <MobileNav active={active} />
    </div>
  );
}
