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
    <AppShell className={cn("max-w-[1320px] gap-8 px-4 pb-[calc(8rem+var(--safe-bottom))] pt-[calc(1rem+var(--safe-top))] sm:px-8 lg:px-10", className)}>
      {(title || description || badge) ? (
        <section className="w-full max-w-3xl border-b border-line pb-8 pt-2 sm:pb-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cocoa">{eyebrow}</p>
          {title ? <h1 className="font-editorial mt-3 text-balance text-4xl font-semibold leading-[1.02] text-ink sm:text-5xl">{title}</h1> : null}
          {description ? <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{description}</p> : null}
          {badge ? <p className="mt-4 text-xs font-semibold text-muted">{badge}</p> : null}
        </section>
      ) : null}

      {children}
    </AppShell>
  );
}
