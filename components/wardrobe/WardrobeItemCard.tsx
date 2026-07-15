import type { WardrobeItem } from "@/types/wardrobe";
import { Badge } from "@/components/ui/Badge";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { cn } from "@/lib/utils";

function measurementLabel(source: string) {
  if (source === "label_ocr") return "From label";
  if (source === "user_confirmed") return "Checked by you";
  if (source === "manual") return "Measured";
  if (source === "ai_estimated") return "Estimated size";
  return "Size unknown";
}

export function WardrobeItemCard({ item }: { item: WardrobeItem }) {
  const status = item.condition === "needs-care" ? "Needs care" : item.condition === "missing-tags" ? "Missing tags" : "Ready";
  const tone = item.condition === "ready" ? "success" : item.condition === "needs-care" ? "warning" : "premium";
  const imageTone = item.imageTone || "from-stone-100 to-stone-300";
  const imageUrl = item.thumbnailUrl || item.imageUrl;

  return (
    <article className="group h-full overflow-hidden rounded-xl3 border border-line bg-surface/90 p-3 shadow-card transition duration-500 hover:-translate-y-1 hover:border-olive/40 hover:shadow-soft">
      <ImageFrame
        src={imageUrl}
        alt={item.name}
        aspect="portrait"
        className={cn("mb-3 border-0", imageUrl ? "" : imageTone)}
        imageClassName="transition duration-700 group-hover:scale-105"
        placeholder={item.category}
        overlay={
          <div className="flex justify-between gap-2">
            <Badge tone={tone} className="bg-surface/85 backdrop-blur">{status}</Badge>
            {item.category ? <Badge className="bg-surface/85 backdrop-blur">{item.category}</Badge> : null}
          </div>
        }
      />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cocoa">{item.color || "Wardrobe piece"}</p>
          <h3 className="line-clamp-2 text-base font-semibold leading-5 text-ink">{item.name}</h3>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.recognizedEntity ? <Badge tone="premium">{item.recognizedEntity}</Badge> : null}
        {item.taggedSize && item.taggedSize !== "unknown" ? <Badge tone="info">Size {item.taggedSize}</Badge> : null}
        {item.garmentFit && item.garmentFit !== "unknown" ? <Badge tone="neutral">{item.garmentFit} fit</Badge> : null}
        {item.measurementSource && item.measurementSource !== "unknown" ? <Badge tone={item.measurementSource === "ai_estimated" ? "warning" : "success"}>{measurementLabel(item.measurementSource)}</Badge> : null}
      </div>
    </article>
  );
}
