"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Home", href: "/home", icon: "⌂" },
  { label: "Occasion", href: "/occasion", icon: "◇" },
  { label: "Wardrobe", href: "/wardrobe", icon: "▦" },
  { label: "Looks", href: "/looks", icon: "◌" },
  { label: "Avatar", href: "/avatar", icon: "◈" },
  { label: "AI Stylist", href: "/stylist", icon: "✦" },
  { label: "Profile", href: "/profile", icon: "○" }
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[430px] border-t border-line bg-surface/95 px-3 pb-[calc(0.75rem+var(--safe-bottom))] pt-3 backdrop-blur md:absolute md:left-1/2 md:-translate-x-1/2 md:rounded-b-[2.25rem]"
      aria-label="Primary navigation"
    >
      <div className="grid grid-cols-7 gap-1">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "focus-ring flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition active:scale-[0.98]",
                active ? "bg-cocoa text-white shadow-card" : "text-muted hover:bg-cocoa/10 hover:text-cocoa"
              )}
              aria-current={active ? "page" : undefined}
              aria-label={`${item.label}${active ? ", current tab" : ""}`}
            >
              <span className="text-base leading-none" aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
