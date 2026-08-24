"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";

const navigationItems = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/features", label: "Features" },
  { href: "/ai-stylist", label: "AI Stylist" },
  { href: "/digital-closet", label: "Digital Closet" }
];

export function PublicNavigation({ signedIn }: { signedIn: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const primaryHref = signedIn ? "/home" : "/register";
  const primaryLabel = signedIn ? "Open MyFitPick" : "Start";

  useEffect(() => {
    if (!menuOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a09]/95 text-white backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8" aria-label="Public navigation">
        <div className="flex min-w-0 items-center gap-8">
          <Link href="/" className="focus-ring shrink-0 rounded-xl bg-surfaceWarm px-2 py-1" aria-label="MyFitPick home">
            <BrandLogo size="sm" priority />
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="focus-ring rounded-xl px-3 py-2 text-sm font-semibold text-white/62 transition hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {!signedIn ? (
            <Link href="/login" className="focus-ring hidden min-h-11 items-center rounded-xl px-3 text-sm font-bold text-white/76 transition hover:text-white sm:inline-flex">
              Sign In
            </Link>
          ) : null}
          <Link
            href={primaryHref}
            className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-ink shadow-soft transition hover:bg-canvas sm:px-5"
          >
            {primaryLabel}
          </Link>
          <button
            type="button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="public-mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="focus-ring inline-flex size-11 items-center justify-center rounded-xl text-white transition hover:bg-white/10 lg:hidden"
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div id="public-mobile-menu" className="border-t border-white/10 bg-[#0a0a09] px-4 pb-[calc(1.25rem+var(--safe-bottom))] pt-3 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="focus-ring flex min-h-12 items-center rounded-2xl px-4 font-editorial text-xl font-semibold text-white transition hover:bg-white/10"
              >
                {item.label}
              </Link>
            ))}
            {!signedIn ? (
              <Link href="/login" onClick={() => setMenuOpen(false)} className="focus-ring mt-2 flex min-h-12 items-center rounded-2xl border border-white/15 bg-white/5 px-4 text-sm font-bold text-white">
                Sign In
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
