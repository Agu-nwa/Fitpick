import type { WardrobeItem } from "@/types/wardrobe";
import { Badge } from "@/components/ui/Badge";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { cn } from "@/lib/utils";

export function OutfitItemCard({ item }: { item: WardrobeItem }) {
  const imageUrl = item.thumbnailUrl || item.imageUrl;

  return (
    <article className="min-w-[148px] rounded-xl3 border border-line bg-surface/80 p-3 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-cocoa/35">
      <ImageFrame
        src={imageUrl}
        alt={item.name}
        className={cn("mb-3 border-line/70", imageUrl ? "" : item.imageTone || "from-stone-100 to-stone-300")}
        placeholder={item.category}
      />
      <h4 className="line-clamp-2 text-xs font-semibold leading-4 text-ink">{item.name}</h4>
      <p className="mt-1 text-[11px] text-muted">{item.color}</p>
      <Badge className="mt-2" tone={item.condition === "ready" ? "success" : item.condition === "needs-care" ? "warning" : "premium"}>
        {item.condition === "needs-care" ? "Needs care" : item.condition === "missing-tags" ? "Missing tags" : "Ready"}
      </Badge>
    </article>
  );
}
