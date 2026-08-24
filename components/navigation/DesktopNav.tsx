"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/utils";
import { accountNavItems, isNavItemActive, primaryNavItems } from "@/components/navigation/nav-items";
import { WalletBalancePill } from "@/components/wallet/WalletBalancePill";

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 flex-none flex-col border-r border-line bg-surfaceWarm px-5 py-7 text-ink lg:flex">
      <Link href="/home" className="focus-ring rounded-2xl px-2 py-1">
        <BrandLogo size="md" priority />
        <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.28em] text-muted">Intelligent wardrobe</span>
      </Link>

      <WalletBalancePill className="mt-5 w-full" />

      <nav className="mt-10 flex flex-col gap-1" aria-label="Primary navigation">
        {primaryNavItems.map((item) => {
          const active = isNavItemActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "focus-ring group flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition duration-200 ease-out active:scale-[0.99]",
                active ? "bg-cocoa text-canvas shadow-soft" : "text-muted hover:bg-canvasSubtle hover:text-ink"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={active ? 2.3 : 1.7} aria-hidden="true" />
              <span>{item.label}</span>
              {active ? <span className="ml-auto size-1.5 rounded-full bg-canvas/85" /> : null}
            </Link>
          );
        })}
      </nav>

      <nav className="mt-8 border-t border-line pt-6" aria-label="Account navigation">
        <p className="px-4 text-[10px] font-bold uppercase tracking-[0.24em] text-muted">Account</p>
        <div className="mt-3 flex flex-col gap-2">
          {accountNavItems.map((item) => {
            const active = isNavItemActive(pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "focus-ring group flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition duration-200 ease-out active:scale-[0.99]",
                  active ? "bg-cocoa/10 text-cocoa" : "text-muted hover:bg-canvasSubtle hover:text-ink"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={17} strokeWidth={active ? 2.2 : 1.7} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="mt-auto border-t border-line pt-5">
        <p className="text-xs leading-5 text-muted">Your wardrobe, styling history, and preferences stay together in MyFitPick.</p>
      </div>
    </aside>
  );
}
