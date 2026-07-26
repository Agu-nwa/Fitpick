import { Card } from "@/components/ui/Card";

export function LoadingCard({ title = "Checking MyFitPick services" }: { title?: string }) {
  return (
    <Card className="overflow-hidden p-5" aria-live="polite">
      <div className="fashion-shimmer h-4 w-2/3 rounded-full bg-line/70" />
      <div className="fashion-shimmer mt-3 h-3 w-full rounded-full bg-line/60" />
      <div className="fashion-shimmer mt-2 h-3 w-4/5 rounded-full bg-line/60" />
      <p className="mt-5 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted">Preparing your view.</p>
    </Card>
  );
}
