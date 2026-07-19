import type { WardrobeImageAsset, WardrobeImagePurpose } from "@/types/ai-tagging";
import { Camera, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { cn } from "@/lib/utils";

export type WardrobeImageSlotDefinition = {
  key: WardrobeImagePurpose;
  label: string;
  helper: string;
  required?: boolean;
};

const slotLabels: WardrobeImageSlotDefinition[] = [
  { key: "front", label: "Main", helper: "Full item view", required: true },
  { key: "back", label: "Angle", helper: "Back, side, or interior" },
  { key: "fabricCloseUp", label: "Detail", helper: "Texture, pattern, or hardware" },
  { key: "label", label: "Product details", helper: "Label, stamp, code, or care tag" }
];

export function WardrobeImageSlots({
  images = {},
  onSelect,
  disabled = false,
  slots = slotLabels
}: {
  images?: Partial<Record<WardrobeImagePurpose, WardrobeImageAsset>>;
  onSelect?: (purpose: WardrobeImagePurpose) => void;
  disabled?: boolean;
  slots?: WardrobeImageSlotDefinition[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {slots.map((slot) => {
        const image = images[slot.key];
        const displayUrl = image?.variants?.thumbnail?.status === "ready" && image.variants.thumbnail.url
          ? image.variants.thumbnail.url
          : image?.url;
        return (
          <button
            key={slot.key}
            type="button"
            className={cn(
              "focus-ring group min-w-0 rounded-2xl text-left transition active:scale-[0.99]",
              disabled ? "cursor-not-allowed opacity-80" : "hover:-translate-y-0.5"
            )}
            onClick={() => onSelect?.(slot.key)}
            disabled={disabled || !onSelect}
            aria-label={`${slot.label} photo slot`}
          >
            <ImageFrame
              aspect="portrait"
              src={displayUrl}
              alt={`${slot.label} photo`}
              placeholder={
                <span>
                  <Camera size={20} className="mx-auto mb-3 text-cocoa" aria-hidden="true" />
                  <span className="block font-editorial text-2xl font-semibold leading-none text-ink">{slot.label}</span>
                  <span className="mt-1 block text-[11px] font-medium text-muted">{slot.helper}</span>
                </span>
              }
              overlay={
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={image?.url ? "success" : slot.required ? "warning" : "neutral"}>{image?.url ? "Added" : slot.required ? "Needed" : "Optional"}</Badge>
                  <span className="inline-flex items-center gap-1 truncate rounded-full bg-surface/90 px-2 py-1 text-[11px] font-semibold text-ink shadow-card backdrop-blur">
                    {image?.url ? <CheckCircle2 size={12} className="text-success" aria-hidden="true" /> : null}
                    {slot.label}
                  </span>
                </div>
              }
            />
          </button>
        );
      })}
    </div>
  );
}
