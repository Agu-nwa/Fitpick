"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { ImageFrame } from "@/components/ui/ImageFrame";

export type ImagePreviewDialogImage = {
  src: string;
  alt: string;
  title?: string;
  subtitle?: string;
};

export function ImagePreviewDialog({
  image,
  onClose
}: {
  image: ImagePreviewDialogImage | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!image) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [image, onClose]);

  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/70 px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-10 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={image.title || image.alt}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/15 bg-surface shadow-card">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{image.title || image.alt}</p>
            {image.subtitle ? <p className="mt-0.5 truncate text-xs text-muted">{image.subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="focus-ring inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-canvas text-muted transition hover:text-ink"
            onClick={onClose}
            aria-label="Close image preview"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="flex max-h-[78vh] items-center justify-center bg-canvas/70 p-3 sm:p-5">
          <ImageFrame
            src={image.src}
            alt={image.alt}
            aspect="fullBody"
            fit="contain"
            showRetry
            context="image.preview_dialog"
            className="max-h-[72vh] w-full border-0 bg-transparent"
          />
        </div>
      </div>
    </div>
  );
}
