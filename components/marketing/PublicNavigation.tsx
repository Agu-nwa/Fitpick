"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";

const navigationItems = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#ways-to-start", label: "Ways to Start" },
  { href: "#complete-look", label: "See a Look" },
  { href: "#faq", label: "FAQ" }
];

export function PublicNavigation({ signedIn }: { signedIn: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const primaryHref = signedIn ? "/home" : "/register";
  const primaryLabel = signedIn ? "Open MyFitPick" : "Style my closet";

  useEffect(() => {
    if (!menuOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-line/90 bg-canvas/95 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8" aria-label="Public navigation">
        <div className="flex min-w-0 items-center gap-8">
          <Link href="/" className="focus-ring shrink-0 rounded-xl" aria-label="MyFitPick home">
            <BrandLogo size="sm" priority />
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="focus-ring rounded-xl px-3 py-2 text-sm font-semibold text-muted transition hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {!signedIn ? (
            <Link href="/login" className="focus-ring hidden min-h-11 items-center rounded-xl px-3 text-sm font-bold text-ink transition hover:text-cocoa sm:inline-flex">
              Sign In
            </Link>
          ) : null}
          <Link
            href={primaryHref}
            className="focus-ring inline-flex min-h-11 items-center justify-center rounded-2xl bg-cocoa px-4 text-sm font-bold text-white shadow-soft transition hover:bg-espresso sm:px-5"
          >
            {primaryLabel}
          </Link>
          <button
            type="button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="public-mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="focus-ring inline-flex size-11 items-center justify-center rounded-xl text-ink transition hover:bg-white lg:hidden"
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div id="public-mobile-menu" className="border-t border-line bg-canvas px-4 pb-[calc(1.25rem+var(--safe-bottom))] pt-3 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="focus-ring flex min-h-12 items-center rounded-2xl px-4 font-editorial text-xl font-semibold text-ink transition hover:bg-white"
              >
                {item.label}
              </Link>
            ))}
            {!signedIn ? (
              <Link href="/login" onClick={() => setMenuOpen(false)} className="focus-ring mt-2 flex min-h-12 items-center rounded-2xl border border-line bg-white px-4 text-sm font-bold text-ink">
                Sign In
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
