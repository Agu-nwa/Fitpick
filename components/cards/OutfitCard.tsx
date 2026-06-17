import type { OutfitRecommendation } from "@/types/outfit";
import { Card } from "@/components/ui/Card";
import { ReasonChip } from "@/components/outfit/ReasonChip";
import { cn } from "@/lib/utils";

export function OutfitCard({ outfit }: { outfit: OutfitRecommendation }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-terracotta">Today's pick</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{outfit.title}</h2>
            <p className="mt-1 text-sm text-muted">{outfit.summary}</p>
          </div>
          <span className="rounded-full bg-success/15 px-3 py-1.5 text-[11px] font-bold text-success">{outfit.confidence}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {outfit.items.map((item) => (
            <div key={item.id} className={cn("h-32 rounded-xl3 bg-gradient-to-br", item.imageTone)} role="img" aria-label={item.name} />
          ))}
        </div>
      </div>
      <div className="border-t border-line bg-[#FBF6EE] p-4">
        <div className="flex flex-wrap gap-2">
          {outfit.reasonChips.map((chip) => <ReasonChip key={chip} label={chip} />)}
        </div>
      </div>
    </Card>
  );
}
