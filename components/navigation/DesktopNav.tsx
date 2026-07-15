"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { primaryNavItems } from "@/components/navigation/BottomNav";

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-none lg:flex-col lg:border-r lg:border-line lg:bg-surface/80 lg:px-4 lg:py-5">
      <Link href="/home" className="focus-ring rounded-2xl px-3 py-2">
        <span className="block text-lg font-semibold tracking-tight text-ink">FitPick</span>
        <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.18em] text-muted">Know what to wear</span>
      </Link>

      <nav className="mt-8 space-y-1" aria-label="Primary navigation">
        {primaryNavItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`) || (item.href === "/home" && pathname === "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "focus-ring flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition",
                active ? "bg-cocoa text-white shadow-card" : "text-muted hover:bg-cocoa/10 hover:text-cocoa"
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className="w-5 text-center text-base leading-none" aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-line bg-canvas p-3 text-xs leading-5 text-muted">
        <span className="font-semibold text-ink">Production launch</span>
        <span className="mt-1 block">Wardrobe, stylist, virtual try-on, and profile controls are ready from one console.</span>
      </div>
    </aside>
  );
}
