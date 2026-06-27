import { Card } from "@/components/ui/Card";

export function LoadingCard({ title = "Checking FitPick services" }: { title?: string }) {
  return (
    <Card className="p-4" aria-live="polite">
      <div className="h-4 w-2/3 animate-pulse rounded-full bg-line/80" />
      <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-line/80" />
      <div className="mt-2 h-3 w-4/5 animate-pulse rounded-full bg-line/80" />
      <p className="mt-4 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted">Preparing a cleaner FitPick view.</p>
    </Card>
  );
}
