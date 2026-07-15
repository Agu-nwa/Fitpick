export function SectionHeader({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">{eyebrow}</p> : null}
        <h2 className="font-editorial text-3xl font-semibold leading-none tracking-tight text-ink">{title}</h2>
      </div>
      {action}
    </div>
  );
}
