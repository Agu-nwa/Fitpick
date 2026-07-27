"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/utils";
import { accountNavItems, isNavItemActive, primaryNavItems } from "@/components/navigation/nav-items";
import { WalletBalancePill } from "@/components/wallet/WalletBalancePill";

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-72 flex-none flex-col border-r border-line/80 bg-white/68 px-6 py-7 shadow-soft backdrop-blur-2xl lg:flex">
      <Link href="/home" className="focus-ring rounded-2xl px-2 py-1">
        <BrandLogo size="md" priority />
        <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.28em] text-muted">Intelligent wardrobe</span>
      </Link>

      <WalletBalancePill className="mt-5 w-full" />

      <nav className="mt-12 flex flex-col gap-2" aria-label="Primary navigation">
        {primaryNavItems.map((item) => {
          const active = isNavItemActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "focus-ring group flex min-h-12 items-center gap-3 rounded-full px-4 text-sm font-bold transition duration-200 ease-out active:scale-[0.99]",
                active ? "bg-espresso text-canvas shadow-glow" : "text-muted hover:bg-white/80 hover:text-ink"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={active ? 2.3 : 1.7} aria-hidden="true" />
              <span>{item.label}</span>
              {active ? <span className="ml-auto size-1.5 rounded-full bg-lime" /> : null}
            </Link>
          );
        })}
      </nav>

      <nav className="mt-8 border-t border-line/80 pt-6" aria-label="Account navigation">
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
                  "focus-ring group flex min-h-11 items-center gap-3 rounded-full px-4 text-sm font-bold transition duration-200 ease-out active:scale-[0.99]",
                  active ? "bg-white text-ink shadow-soft" : "text-muted hover:bg-white/80 hover:text-ink"
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

      <div className="mt-auto grid gap-3">
        <Link href="/stylist/create-look" className="fashion-shimmer group overflow-hidden rounded-xl3 border border-olive/40 bg-espresso p-5 text-canvas shadow-card transition duration-200 ease-out hover:-translate-y-0.5 hover:border-cocoa/50 hover:shadow-lift">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-canvas/60">AI studio</p>
          <p className="font-editorial mt-3 text-2xl font-semibold leading-none">Create a look</p>
          <span className="mt-5 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            Start styling
            <ArrowUpRight size={16} className="transition group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </Link>
        <Link href="/stylist/match" className="group rounded-xl3 border border-line bg-white/70 p-4 text-ink shadow-soft transition duration-200 ease-out hover:-translate-y-0.5 hover:border-cocoa/35 hover:bg-white">
          <span className="flex items-center justify-between text-sm font-bold">
            Match an Outfit
            <ArrowUpRight size={15} className="text-cocoa transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </Link>
      </div>
    </aside>
  );
}
