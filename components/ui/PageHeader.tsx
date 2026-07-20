export function PageHeader({
  title,
  subtitle,
  eyebrow,
  compact = false
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  compact?: boolean;
}) {
  return (
    <header className={compact ? "mb-5 max-w-3xl border-b border-line pb-4" : "mb-8 max-w-3xl border-b border-line pb-7"}>
      {eyebrow ? <p className={compact ? "mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cocoa" : "mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-cocoa"}>{eyebrow}</p> : null}
      <h1 className={compact ? "text-balance text-3xl font-bold leading-tight text-ink sm:text-4xl" : "font-editorial text-balance text-4xl font-semibold leading-[0.98] tracking-editorial text-ink sm:text-5xl lg:text-6xl"}>{title}</h1>
      {subtitle ? <p className={compact ? "mt-2 max-w-2xl text-sm leading-6 text-muted" : "mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base"}>{subtitle}</p> : null}
    </header>
  );
}
