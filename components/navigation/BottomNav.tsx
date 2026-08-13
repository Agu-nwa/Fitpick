"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isNavItemActive, primaryNavItems } from "@/components/navigation/nav-items";

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="glass-panel fixed inset-x-3 bottom-2 z-40 mx-auto w-auto max-w-[620px] rounded-[1.55rem] px-1.5 pb-[calc(0.45rem+var(--safe-bottom))] pt-1.5 shadow-soft lg:hidden"
      aria-label="Primary navigation"
    >
      <div className="flex w-full min-w-0 items-stretch gap-1 overflow-hidden">
        {primaryNavItems.map((item) => {
          const active = isNavItemActive(pathname, item);
          const featured = item.href === "/stylist";
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "focus-ring flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 overflow-hidden px-1 text-center transition duration-200 ease-out active:scale-[0.97]",
                featured ? "rounded-[1.35rem]" : "rounded-2xl",
                active && featured ? "bg-olive text-canvas shadow-glow" : "",
                active && !featured ? "bg-cocoa text-canvas shadow-glow" : "",
                !active ? "text-muted hover:bg-ink/5 hover:text-ink" : ""
              )}
              aria-current={active ? "page" : undefined}
              aria-label={`${item.label}${active ? ", current tab" : ""}`}
            >
              <Icon size={featured ? 20 : 18} strokeWidth={active ? 2.4 : 1.7} aria-hidden="true" />
              <span className="block w-full truncate whitespace-nowrap text-center text-xs font-bold leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
