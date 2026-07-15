import { BottomNav } from "@/components/navigation/BottomNav";
import { DesktopNav } from "@/components/navigation/DesktopNav";
import { cn } from "@/lib/utils";

export function AppShell({ children, showNav = true, className }: { children: React.ReactNode; showNav?: boolean; className?: string }) {
  return (
    <main
      id="main-content"
      className="relative mx-auto flex min-h-[100svh] w-full bg-canvas shadow-soft sm:max-w-[640px] md:my-6 md:min-h-[880px] md:overflow-hidden md:rounded-[2.25rem] md:border md:border-line lg:max-w-[1180px] lg:flex-row xl:max-w-[1320px]"
    >
      {showNav ? <DesktopNav /> : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className={cn("mx-auto flex w-full max-w-[720px] flex-1 flex-col px-5 pb-[calc(7.5rem+var(--safe-bottom))] pt-[calc(1.5rem+var(--safe-top))] sm:px-6 lg:max-w-none lg:px-8 lg:pb-8 lg:pt-8 xl:px-10", className)}>
          {children}
        </div>
      </div>
      {showNav ? <BottomNav /> : null}
    </main>
  );
}
