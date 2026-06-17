import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ReadinessItem } from "@/lib/frontend-readiness";

const labels = {
  complete: "complete",
  "ready-for-backend": "backend-ready",
  "frontend-only": "frontend-only",
} as const;

export function ReadinessCard({ item }: { item: ReadinessItem }) {
  const tone = item.status === "complete" ? "success" : item.status === "ready-for-backend" ? "warning" : "neutral";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">{item.area}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{item.detail}</p>
        </div>
        <StatusBadge tone={tone}>{labels[item.status]}</StatusBadge>
      </div>
    </Card>
  );
}
