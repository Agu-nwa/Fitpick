"use client";

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
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm"
        >
          ✕
        </button>

        <img
          src={previewUrl}
          alt="AI Outfit Preview"
          className="w-full rounded-2xl object-cover"
        />

        <p className="mt-4 text-center text-sm text-gray-500">
          AI-generated outfit preview
        </p>
      </div>
    </div>
  );
}
