import type { WardrobeItem } from "@/types/wardrobe";
import { cn } from "@/lib/utils";

export function OutfitItemCard({ item }: { item: WardrobeItem }) {
  const imageUrl = item.thumbnailUrl || item.imageUrl;

  return (
    <article className="min-w-[126px] rounded-2xl border border-line bg-surface p-3">
      <div
        className={cn("mb-3 h-24 rounded-2xl bg-gradient-to-br bg-cover bg-center", item.imageTone || "from-stone-100 to-stone-300")}
        style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
        role="img"
        aria-label={item.name}
      />
      <h4 className="text-xs font-semibold text-ink">{item.name}</h4>
      <p className="mt-1 text-[11px] text-muted">{item.color} · {item.condition === "needs-care" ? "Needs care" : item.condition === "missing-tags" ? "Missing tags" : "Ready"}</p>
    </article>
  );
}
