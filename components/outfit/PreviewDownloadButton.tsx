"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { downloadAvatarPreview } from "@/lib/api-client";

type PreviewDownloadButtonProps = {
  outfitId: string;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
};

function directDownloadUrl(outfitId: string) {
  return `/api/outfits/${encodeURIComponent(outfitId)}/avatar-preview/download`;
}

export function PreviewDownloadButton({ outfitId, className, variant = "secondary" }: PreviewDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function handleDownload() {
    if (!outfitId || downloading) return;
    setDownloading(true);
    setError("");

    const result = await downloadAvatarPreview(outfitId);
    setDownloading(false);

    if (!result.ok) {
      setError(result.error.message || "Unable to download this preview right now.");
      return;
    }

    try {
      const objectUrl = URL.createObjectURL(result.data.blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = result.data.filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
    } catch {
      window.location.assign(directDownloadUrl(outfitId));
    }
  }

  return (
    <div className={className}>
      <Button type="button" variant={variant} className="w-full" onClick={() => void handleDownload()} disabled={downloading}>
        <Download size={16} aria-hidden="true" />
        {downloading ? "Preparing download..." : "Download Preview"}
      </Button>
      {error ? <p className="mt-2 text-xs font-semibold leading-5 text-red-600">{error}</p> : null}
    </div>
  );
}
