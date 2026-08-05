# Shared layouts

## `components/layout/AppShell.tsx`

Global authenticated shell. Desktop has a fixed-width left navigation; mobile has a safe-area-aware bottom navigation. Content is centered up to 1480px.

```tsx
import { BottomNav } from "@/components/navigation/BottomNav";
import { ContextPageChrome } from "@/components/navigation/ContextPageChrome";
import { DesktopNav } from "@/components/navigation/DesktopNav";
import { SupportLauncher } from "@/components/support/SupportLauncher";
import { FashionBackdrop } from "@/components/ui/FashionBackdrop";
import { cn } from "@/lib/utils";

export function AppShell({ children, showNav = true, showMobileNav, showSupport, className }: {
  children: React.ReactNode; showNav?: boolean; showMobileNav?: boolean; showSupport?: boolean; className?: string;
}) {
  const shouldShowSupport = showSupport ?? showNav;
  const shouldShowMobileNav = showMobileNav ?? showNav;
  return (
    <main id="main-content" className="relative isolate flex min-h-[100svh] w-full overflow-x-clip bg-canvas text-ink lg:flex-row">
      <FashionBackdrop density="soft" />
      {showNav ? <DesktopNav /> : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className={cn("mx-auto flex min-w-0 w-full max-w-[1480px] flex-1 flex-col px-5 pb-[calc(11rem+var(--safe-bottom))] pt-[calc(1.5rem+var(--safe-top))] sm:px-8 lg:px-12 lg:pb-12 lg:pt-10 xl:px-16", className)}>
          <ContextPageChrome showAccountNav={showNav} />
          {children}
        </div>
      </div>
      {shouldShowMobileNav ? <BottomNav /> : null}
      {shouldShowSupport ? <SupportLauncher /> : null}
    </main>
  );
}
```

## Supporting layout components

- `components/navigation/DesktopNav.tsx`: 18rem editorial sidebar, wallet balance, primary/account navigation, and create/match shortcuts.
- `components/navigation/BottomNav.tsx`: fixed glass mobile navigation with safe-area padding.
- `components/navigation/ContextPageChrome.tsx`: sticky contextual back/title/close bar for detail routes.
- `components/support/SupportLauncher.tsx`: floating support action, positioned above the mobile navigation.
- `components/ui/FashionBackdrop.tsx`: subdued editorial fashion imagery behind the application shell.
