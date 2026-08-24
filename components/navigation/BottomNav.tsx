"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isNavItemActive, primaryNavItems } from "@/components/navigation/nav-items";

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-canvas/10 bg-ink/98 px-3 pb-[calc(0.5rem+var(--safe-bottom))] pt-2 text-canvas shadow-[0_-12px_32px_rgba(10,10,9,0.12)] backdrop-blur-xl lg:hidden"
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
                active ? "bg-cocoa text-canvas" : "text-canvas/55 hover:bg-canvas/10 hover:text-canvas"
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
