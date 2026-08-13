"use client";

import { ImageFrame } from "@/components/ui/ImageFrame";

type OutfitPreviewProps = {
  previewUrl: string;
  onClose: () => void;
};

export function OutfitPreview({
  previewUrl,
  onClose
}: OutfitPreviewProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative max-w-lg rounded-3xl bg-white p-4 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close outfit preview"
          className="focus-ring absolute right-3 top-3 z-10 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-gray-200 bg-white px-3 py-1 text-sm"
        >
          ✕
        </button>

        <ImageFrame
          src={previewUrl}
          alt="AI Outfit Preview"
          aspect="fullBody"
          fit="contain"
          showRetry
          context="outfit.preview_dialog"
          className="w-full border-0 bg-transparent"
        />

        <p className="mt-4 text-center text-sm text-gray-500">
          AI-generated outfit preview
        </p>
      </div>
    </div>
  );
}
