import { BottomNav } from "@/components/navigation/BottomNav";
import { cn } from "@/lib/utils";

export function AppShell({ children, showNav = true, className }: { children: React.ReactNode; showNav?: boolean; className?: string }) {
  return (
    <main
      id="main-content"
      className="relative mx-auto flex min-h-[100svh] w-full max-w-[430px] flex-col bg-canvas shadow-soft md:my-6 md:min-h-[880px] md:overflow-hidden md:rounded-[2.25rem] md:border md:border-line"
    >
      <div className={cn("flex-1 px-5 pb-[calc(7.5rem+var(--safe-bottom))] pt-[calc(1.5rem+var(--safe-top))]", className)}>
        {children}
      </div>
      {showNav ? <BottomNav /> : null}
    </main>
  );
}
