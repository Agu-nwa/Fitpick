export function PageHeader({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: string }) {
  return (
    <header className="mb-8 max-w-3xl border-b border-line pb-7">
      {eyebrow ? <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-cocoa">{eyebrow}</p> : null}
      <h1 className="font-editorial text-balance text-5xl font-semibold leading-[0.95] tracking-editorial text-ink sm:text-6xl lg:text-7xl">{title}</h1>
      {subtitle ? <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">{subtitle}</p> : null}
    </header>
  );
}
