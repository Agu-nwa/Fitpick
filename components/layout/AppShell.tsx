import { BottomNav } from "@/components/navigation/BottomNav";
import { DesktopNav } from "@/components/navigation/DesktopNav";
import { cn } from "@/lib/utils";

export function AppShell({ children, showNav = true, className }: { children: React.ReactNode; showNav?: boolean; className?: string }) {
  return (
    <main
      id="main-content"
      className="relative flex min-h-[100svh] w-full bg-canvas text-ink lg:flex-row"
    >
      {showNav ? <DesktopNav /> : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className={cn("mx-auto flex w-full max-w-[1480px] flex-1 flex-col px-5 pb-[calc(7.5rem+var(--safe-bottom))] pt-[calc(1.5rem+var(--safe-top))] sm:px-8 lg:px-12 lg:pb-12 lg:pt-10 xl:px-16", className)}>
          {children}
        </div>
      </div>
      {showNav ? <BottomNav /> : null}
    </main>
  );
}
