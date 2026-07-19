"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Settings, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { primaryNavItems } from "@/components/navigation/BottomNav";
import { WalletBalancePill } from "@/components/wallet/WalletBalancePill";

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-72 flex-none flex-col border-r border-line bg-white/72 px-6 py-7 shadow-card backdrop-blur-xl lg:flex">
      <Link href="/home" className="focus-ring rounded-2xl px-2 py-1">
        <span className="flex items-center gap-2 text-xl font-extrabold tracking-[-0.06em] text-ink">
          <span className="flex size-8 items-center justify-center rounded-full bg-cocoa text-canvas">
            <Sparkles size={16} aria-hidden="true" />
          </span>
          MyFitPick
        </span>
        <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.28em] text-muted">Intelligent wardrobe</span>
      </Link>

      <WalletBalancePill className="mt-5 w-full" />

      <nav className="mt-12 flex flex-col gap-2" aria-label="Primary navigation">
        {primaryNavItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`) || (item.href === "/home" && pathname === "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "focus-ring group flex min-h-12 items-center gap-3 rounded-full px-4 text-sm font-bold transition duration-300",
                active ? "bg-espresso text-canvas" : "text-muted hover:bg-white hover:text-ink"
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

      <nav className="mt-6 border-t border-line pt-6" aria-label="Account navigation">
        {[
          { label: "Profile", href: "/profile", icon: UserRound },
          { label: "Settings", href: "/profile/preferences", icon: Settings }
        ].map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "focus-ring flex min-h-10 items-center gap-3 rounded-full px-4 text-xs font-bold transition duration-300",
                active ? "bg-cocoa/12 text-ink" : "text-muted hover:bg-white hover:text-ink"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={16} strokeWidth={active ? 2.3 : 1.7} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <Link href="/outfit" className="fashion-shimmer group mt-auto overflow-hidden rounded-xl3 border border-olive/40 bg-espresso p-5 text-canvas shadow-card transition hover:border-cocoa/50">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-canvas/60">AI edit</p>
        <p className="font-editorial mt-3 text-2xl font-semibold leading-none">What should I wear?</p>
        <span className="mt-5 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
          Create a look
          <ArrowUpRight size={16} className="transition group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </Link>
    </aside>
  );
}
