import { Card } from "@/components/ui/Card";

export function LoadingState({ title = "Building your outfit" }: { title?: string }) {
  return (
    <Card aria-live="polite">
      <div className="space-y-4">
        <div className="h-5 w-2/3 animate-pulse rounded-full bg-line/80" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-28 animate-pulse rounded-2xl bg-line/80" />
          <div className="h-28 animate-pulse rounded-2xl bg-line/80" />
          <div className="h-28 animate-pulse rounded-2xl bg-line/80" />
          <div className="h-28 animate-pulse rounded-2xl bg-line/80" />
        </div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-sm leading-6 text-muted">Checking occasion, color balance, weather, and worn history.</p>
      </div>
    </Card>
  );
}
