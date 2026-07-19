"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Sparkles, UserRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const accountNavItems: Array<{ label: string; href: string; icon: LucideIcon }> = [
  { label: "Profile", href: "/profile", icon: UserRound },
  { label: "Settings", href: "/profile/preferences", icon: Settings }
];

export function MobileAccountNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-5 flex min-w-0 items-center justify-between gap-3 lg:hidden" aria-label="Account navigation">
      <Link href="/home" className="focus-ring flex min-w-0 items-center gap-2 rounded-full pr-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cocoa text-canvas">
          <Sparkles size={15} aria-hidden="true" />
        </span>
        <span className="truncate text-sm font-extrabold tracking-tight text-ink">MyFitPick</span>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        {accountNavItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition",
                active ? "border-cocoa bg-cocoa text-canvas shadow-glow" : "border-line bg-white/72 text-muted shadow-card backdrop-blur-xl hover:text-ink"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={14} strokeWidth={active ? 2.3 : 1.8} aria-hidden="true" />
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
