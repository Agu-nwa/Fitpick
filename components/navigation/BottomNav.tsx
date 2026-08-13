"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isNavItemActive, primaryNavItems } from "@/components/navigation/nav-items";

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surfaceWarm/95 px-3 pb-[calc(0.5rem+var(--safe-bottom))] pt-2 backdrop-blur-xl lg:hidden"
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
                "rounded-xl",
                active ? "bg-cocoa/10 text-cocoa" : "text-muted hover:bg-canvasSubtle hover:text-ink"
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
