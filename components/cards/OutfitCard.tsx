import type { OutfitRecommendation } from "@/types/outfit";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { ReasonChip } from "@/components/outfit/ReasonChip";
import { cn } from "@/lib/utils";

export function OutfitCard({ outfit }: { outfit: OutfitRecommendation }) {
  const roleById = new Map((outfit.recommendationPieces || []).map((piece) => [piece.wardrobeItemId, piece.role]));
  return (
    <Card className="group overflow-hidden p-0">
      <div className="p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">Today&apos;s edit</p>
            <h2 className="font-editorial mt-2 text-4xl font-semibold leading-none tracking-tight text-ink">{outfit.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{outfit.summary}</p>
          </div>
          <Badge tone={outfit.confidence === "Strong match" ? "success" : outfit.confidence === "Good match" ? "premium" : "warning"}>{outfit.confidence}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {outfit.items.map((item, index) => {
            const role = roleById.get(item.id);
            const primary = ["top", "bottom", "dress", "outerwear"].includes(role || "") && index < 4;
            const compact = ["footwear", "bag", "accessory"].includes(role || "");
            return (
            <ImageFrame
              key={item.id}
              src={item.thumbnailUrl || item.imageUrl}
              alt={item.name}
              fit={compact ? "contain" : "cover"}
              className={cn(
                "border-0 bg-surface",
                primary ? "col-span-2 row-span-2" : "",
                item.thumbnailUrl || item.imageUrl ? "" : item.imageTone || "from-stone-100 to-stone-300"
              )}
              imageClassName="transition duration-700 group-hover:scale-105"
              placeholder={<span>{item.name}<span className="mt-1 block font-normal capitalize">{role || item.category}</span></span>}
            />
          );})}
        </div>
      </div>
      <div className="border-t border-line bg-canvas/60 p-4">
        <div className="flex flex-wrap gap-2">
          {outfit.reasonChips.map((chip) => <ReasonChip key={chip} label={chip} />)}
        </div>
      </div>
    </Card>
  );
}
