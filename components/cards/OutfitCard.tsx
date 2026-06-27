import type { OutfitRecommendation } from "@/types/outfit";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ImageFrame } from "@/components/ui/ImageFrame";
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
          <Badge tone={outfit.confidence === "Strong match" ? "success" : outfit.confidence === "Good match" ? "premium" : "warning"}>{outfit.confidence}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {outfit.items.map((item) => (
            <ImageFrame
              key={item.id}
              src={item.thumbnailUrl || item.imageUrl}
              alt={item.name}
              className={cn("border-0", item.thumbnailUrl || item.imageUrl ? "" : item.imageTone || "from-stone-100 to-stone-300")}
              placeholder={item.name}
            />
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
