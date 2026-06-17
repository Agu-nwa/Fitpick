export function PageHeader({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: string }) {
  return (
    <header className="mb-6">
      {eyebrow ? <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-terracotta">{eyebrow}</p> : null}
      <h1 className="text-3xl font-semibold tracking-tight text-ink">{title}</h1>
      {subtitle ? <p className="mt-2 text-sm leading-6 text-muted">{subtitle}</p> : null}
    </header>
  );
}
