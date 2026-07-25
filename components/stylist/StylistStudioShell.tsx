import Link from "next/link";
import { Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";

export function StylistStudioShell({
  children,
  eyebrow = "AI fashion studio",
  title,
  description,
  badge,
  className
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
  badge?: string;
  className?: string;
}) {
  return (
    <AppShell showNav={false} showSupport className={cn("max-w-[1320px] gap-8 px-4 pb-[calc(7rem+var(--safe-bottom))] pt-[calc(1rem+var(--safe-top))] sm:px-8 lg:px-10", className)}>
      <header className="sticky top-[var(--safe-top)] z-20 -mx-1 rounded-full border border-line/80 bg-surface/85 px-3 py-2 shadow-soft backdrop-blur-xl sm:mx-0 sm:px-4">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <Link href="/home" className="focus-ring inline-flex min-w-0 shrink-0 rounded-full" aria-label="Go to Home">
            <BrandLogo size="sm" priority />
          </Link>
          <nav aria-label="Stylist studio navigation" className="flex min-w-0 items-center justify-end gap-1 text-xs font-bold text-muted sm:gap-2">
            <Link href="/stylist" className="focus-ring hidden min-h-9 items-center rounded-full px-3 transition hover:bg-canvas hover:text-ink sm:inline-flex">Workspace</Link>
            <Link href="/wallet" className="focus-ring inline-flex min-h-9 items-center rounded-full px-3 transition hover:bg-canvas hover:text-ink">Credits</Link>
            <Link href="/profile" className="focus-ring inline-flex min-h-9 items-center rounded-full px-3 transition hover:bg-canvas hover:text-ink">Account</Link>
            <Link href="/wallet" className="focus-ring inline-flex min-h-9 items-center rounded-full bg-cocoa px-3 text-canvas shadow-glow transition hover:bg-cocoa/90">Top up</Link>
          </nav>
        </div>
      </header>

      {(title || description || badge) ? (
        <section className="mx-auto w-full max-w-5xl text-center">
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.26em] text-cocoa">
            <Sparkles size={14} aria-hidden="true" />
            {eyebrow}
          </p>
          {title ? <h1 className="font-editorial mt-4 text-5xl font-semibold leading-[0.9] text-ink sm:text-7xl">{title}</h1> : null}
          {description ? <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">{description}</p> : null}
          {badge ? <p className="mt-5 inline-flex rounded-full border border-line bg-surface/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-muted">{badge}</p> : null}
        </section>
      ) : null}

      {children}
    </AppShell>
  );
}
