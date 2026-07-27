import { Sparkles } from "lucide-react";
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
