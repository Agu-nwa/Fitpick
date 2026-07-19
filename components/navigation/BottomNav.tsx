"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Images, Shirt, Sparkles, UserRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const primaryNavItems: Array<{ label: string; href: string; icon: LucideIcon }> = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Closet", href: "/wardrobe", icon: Shirt },
  { label: "Stylist", href: "/stylist", icon: Sparkles },
  { label: "Avatar", href: "/avatar", icon: UserRound },
  { label: "Looks", href: "/looks", icon: Images }
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="glass-panel fixed inset-x-3 bottom-2 z-40 mx-auto w-auto max-w-[620px] rounded-[1.25rem] px-1.5 pb-[calc(0.45rem+var(--safe-bottom))] pt-1.5 shadow-soft lg:hidden"
      aria-label="Primary navigation"
    >
      <div className="flex w-full min-w-0 items-stretch gap-1 overflow-hidden">
        {primaryNavItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`) || (item.href === "/home" && pathname === "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "focus-ring flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl px-1 text-center transition active:scale-[0.98]",
                active ? "bg-cocoa text-canvas shadow-glow" : "text-muted hover:bg-ink/5 hover:text-ink"
              )}
              aria-current={active ? "page" : undefined}
              aria-label={`${item.label}${active ? ", current tab" : ""}`}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 1.7} aria-hidden="true" />
              <span className="block w-full truncate whitespace-nowrap text-center text-[11px] font-bold leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
