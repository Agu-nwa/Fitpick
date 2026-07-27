"use client";

import Link from "next/link";
import { Settings, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function MobileAccountNav() {
  return (
    <div className="sticky top-[var(--safe-top)] z-30 -mx-1 mb-5 flex min-w-0 items-center justify-between gap-3 rounded-[1.6rem] border border-line/70 bg-canvas/82 px-2 py-2 shadow-soft backdrop-blur-xl lg:hidden">
      <Link href="/home" className="focus-ring flex min-w-0 items-center gap-2 rounded-full pr-2">
        <BrandLogo size="sm" priority />
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        <Link href="/profile" className="focus-ring inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface/86 text-muted shadow-card transition hover:text-ink" aria-label="Open profile">
          <UserRound size={17} aria-hidden="true" />
        </Link>
        <Link href="/profile/preferences" className="focus-ring inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface/86 text-muted shadow-card transition hover:text-ink" aria-label="Open settings">
          <Settings size={17} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
