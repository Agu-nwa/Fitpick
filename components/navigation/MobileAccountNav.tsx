"use client";

import Link from "next/link";
import { Settings, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function MobileAccountNav() {
  return (
    <div className="mb-5 flex min-w-0 items-center justify-between gap-3 lg:hidden">
      <Link href="/home" className="focus-ring flex min-w-0 items-center gap-2 rounded-full pr-2">
        <BrandLogo size="sm" priority />
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        <Link href="/profile" className="focus-ring inline-flex size-10 items-center justify-center rounded-full border border-line bg-surface/80 text-muted shadow-card" aria-label="Open profile">
          <UserRound size={17} aria-hidden="true" />
        </Link>
        <Link href="/profile/preferences" className="focus-ring inline-flex size-10 items-center justify-center rounded-full border border-line bg-surface/80 text-muted shadow-card" aria-label="Open settings">
          <Settings size={17} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
