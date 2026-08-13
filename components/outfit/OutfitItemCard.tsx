"use client";

import { useState } from "react";
import type { WardrobeItem } from "@/types/wardrobe";
import { Badge } from "@/components/ui/Badge";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { ImagePreviewDialog, type ImagePreviewDialogImage } from "@/components/ui/ImagePreviewDialog";
import { cn } from "@/lib/utils";

export function OutfitItemCard({ item }: { item: WardrobeItem }) {
  const imageUrl = item.thumbnailUrl || item.imageUrl;
  const [viewingImage, setViewingImage] = useState<ImagePreviewDialogImage | null>(null);

  return (
    <>
      <article className="min-w-[148px] rounded-xl3 border border-line bg-surface/80 p-3 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-cocoa/35">
        <button
          type="button"
          className="focus-ring block w-full rounded-xl3 text-left"
          onClick={() => {
            if (!imageUrl) return;
            setViewingImage({
              src: imageUrl,
              alt: item.name,
              title: item.name,
              subtitle: [item.color, item.category].filter(Boolean).join(" · ")
            });
          }}
          aria-label={`View ${item.name}`}
        >
          <ImageFrame
            src={imageUrl}
            fallbackSrc={item.thumbnailUrl ? item.imageUrl : undefined}
            alt={item.name}
            context="outfit.item"
            className={cn("mb-3 border-line/70", imageUrl ? "" : item.imageTone || "from-stone-100 to-stone-300")}
            placeholder={item.category}
          />
        </button>
        <h4 className="line-clamp-2 text-xs font-semibold leading-4 text-ink">{item.name}</h4>
        <p className="mt-1 text-[11px] text-muted">{item.color}</p>
        <Badge className="mt-2" tone={item.condition === "ready" ? "success" : item.condition === "needs-care" ? "warning" : "premium"}>
          {item.condition === "needs-care" ? "Needs care" : item.condition === "missing-tags" ? "Missing tags" : "Ready"}
        </Badge>
      </article>
      <ImagePreviewDialog image={viewingImage} onClose={() => setViewingImage(null)} />
    </>
  );
}
