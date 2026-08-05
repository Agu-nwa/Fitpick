import { BottomNav } from "@/components/navigation/BottomNav";
import { ContextPageChrome } from "@/components/navigation/ContextPageChrome";
import { DesktopNav } from "@/components/navigation/DesktopNav";
import { SupportLauncher } from "@/components/support/SupportLauncher";
import { FashionBackdrop } from "@/components/ui/FashionBackdrop";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  showNav = true,
  showMobileNav,
  showSupport,
  contextCloseHref,
  className
}: {
  children: React.ReactNode;
  showNav?: boolean;
  showMobileNav?: boolean;
  showSupport?: boolean;
  contextCloseHref?: string;
  className?: string;
}) {
  const shouldShowSupport = showSupport ?? showNav;
  const shouldShowMobileNav = showMobileNav ?? showNav;

  return (
    <main
      id="main-content"
      className="relative isolate flex min-h-[100svh] w-full overflow-x-clip bg-canvas text-ink lg:flex-row"
    >
      <FashionBackdrop density="soft" />
      {showNav ? <DesktopNav /> : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className={cn("mx-auto flex min-w-0 w-full max-w-[1480px] flex-1 flex-col px-5 pb-[calc(11rem+var(--safe-bottom))] pt-[calc(1.5rem+var(--safe-top))] sm:px-8 lg:px-12 lg:pb-12 lg:pt-10 xl:px-16", className)}>
          <ContextPageChrome showAccountNav={showNav} closeHref={contextCloseHref} />
          {children}
        </div>
      </div>
      {shouldShowMobileNav ? <BottomNav /> : null}
      {shouldShowSupport ? <SupportLauncher /> : null}
    </main>
  );
}
