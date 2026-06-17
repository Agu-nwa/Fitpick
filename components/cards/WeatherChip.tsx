export function WeatherChip({ label = "Hot day — choose lighter pieces" }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-xs font-semibold text-cocoa shadow-card">
      <span aria-hidden>☼</span>
      <span>{label}</span>
    </div>
  );
}
