"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

export function MobileAccountNav() {
  return (
    <div className="mb-5 flex min-w-0 items-center justify-between gap-3 lg:hidden">
      <Link href="/home" className="focus-ring flex min-w-0 items-center gap-2 rounded-full pr-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cocoa text-canvas">
          <Sparkles size={15} aria-hidden="true" />
        </span>
        <span className="truncate text-sm font-extrabold tracking-tight text-ink">MyFitPick</span>
      </Link>
    </div>
  );
}
