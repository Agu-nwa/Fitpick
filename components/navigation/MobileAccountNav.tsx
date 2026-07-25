"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function MobileAccountNav() {
  return (
    <div className="mb-5 flex min-w-0 items-center justify-between gap-3 lg:hidden">
      <Link href="/home" className="focus-ring flex min-w-0 items-center gap-2 rounded-full pr-2">
        <BrandLogo size="sm" priority />
      </Link>
    </div>
  );
}
