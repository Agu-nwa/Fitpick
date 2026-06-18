import type { WardrobeItem } from "@/types/wardrobe";
import { cn } from "@/lib/utils";

export function WardrobeItemCard({ item }: { item: WardrobeItem }) {
  const status = item.condition === "needs-care" ? "Needs care" : item.condition === "missing-tags" ? "Missing tags" : "Ready";
  const imageTone = item.imageTone || "from-stone-100 to-stone-300";
  const imageUrl = item.thumbnailUrl || item.imageUrl;

  return (
    <article className="rounded-xl3 border border-line bg-surface p-3 shadow-card">
      <div
        className={cn("mb-3 aspect-[4/5] rounded-2xl bg-gradient-to-br bg-cover bg-center", imageTone)}
        style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
        role="img"
        aria-label={item.name}
      />
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold leading-5 text-ink">{item.name}</h3>
          <p className="mt-1 text-xs text-muted">{item.color}</p>
        </div>
      </div>
      <span className={cn("mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold", item.condition === "ready" ? "bg-success/15 text-success" : item.condition === "needs-care" ? "bg-warning/15 text-warning" : "bg-terracotta/15 text-terracotta")}>{status}</span>
    </article>
  );
}
