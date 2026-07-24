"use client";

import Link from "next/link";
import { Eye, Sparkles, WandSparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PreviewDownloadButton } from "@/components/outfit/PreviewDownloadButton";
import { simpleFitStatus, simplePreviewType } from "@/lib/copy/simple-copy";
import { completenessLabel } from "@/lib/recommendation/completeness";
import { safeTryOnErrorMessage, safeUserMessages } from "@/lib/user-facing-errors";
import type { AvatarProfileData } from "@/lib/api-client";
import type { OutfitRecommendation, PreviewAccuracySummary } from "@/types/outfit";

type DigitalHumanTryOnPanelProps = {
  outfit: OutfitRecommendation;
  avatarProfile?: AvatarProfileData["profile"] | null;
  previewUrl?: string;
  previewStatus?: string;
  previewError?: string;
  isGenerating?: boolean;
  accuracyLevel?: PreviewAccuracySummary;
  fitStatus?: string;
  fitWarnings?: string[];
  visualizationWarnings?: string[];
  onOpenPreview?: () => void;
  onGenerateFitLocked?: () => void;
  onRegenerate?: () => void;
};

function fitStatusLabel(status?: string) {
  return simpleFitStatus(status);
}

const tryOnProgressSteps = [
  "Checking outfit",
  "Checking Credits",
  "Preparing images",
  "Submitting try-on",
  "Generating preview",
  "Saving preview",
  "Complete"
];

export function DigitalHumanTryOnPanel({
  outfit,
  avatarProfile,
  previewUrl,
  previewStatus = "not_started",
  previewError = "",
  isGenerating = false,
  accuracyLevel,
  fitStatus,
  fitWarnings = [],
  visualizationWarnings = [],
  onOpenPreview,
  onGenerateFitLocked,
  onRegenerate
}: DigitalHumanTryOnPanelProps) {
  const setupRequired = /try-on model|avatar settings|full-body|model image/i.test(previewError || "");
  const safeFitWarnings = safeUserMessages(fitWarnings);
  const safeCompletenessWarnings = safeUserMessages([...(outfit.completenessWarnings || []), ...visualizationWarnings]);

  return (
    <div className="space-y-4">
      <Card className="space-y-4 overflow-hidden border-olive/20 bg-gradient-to-br from-surface via-surface to-olive/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">
              <WandSparkles size={14} aria-hidden="true" />
              Virtual try-on
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Generate a photorealistic model wearing the exact selected closet items.
            </p>
          </div>
          <Badge tone={accuracyLevel?.id === "fit_locked" ? "success" : "premium"}>
            {simplePreviewType(accuracyLevel)}
          </Badge>
        </div>

        {previewUrl ? (
          <button
            type="button"
            className="focus-ring block w-full overflow-hidden rounded-xl3 border border-line bg-canvas"
            onClick={onOpenPreview}
          >
            <img src={previewUrl} alt={`${outfit.title} avatar preview`} className="aspect-square w-full object-cover" />
          </button>
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-xl3 border border-dashed border-line bg-canvas/70 px-5 text-center">
            <div>
              <Sparkles size={24} className="mx-auto mb-3 text-cocoa" aria-hidden="true" />
              <p className="font-editorial text-3xl font-semibold leading-none text-ink">Create on-model preview</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
                MyFitPick will use the saved clothing photos to generate a digital human wearing this outfit.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={previewStatus === "ready" ? "success" : previewStatus === "failed" ? "danger" : "premium"}>
            {previewStatus === "ready" ? "Preview ready" : previewStatus === "failed" ? "Preview failed" : "Preview mode"}
          </Badge>
          <Badge tone={fitStatus === "likely_fits" || fitStatus === "oversized_intended" ? "success" : "warning"}>
            {fitStatusLabel(fitStatus)}
          </Badge>
          {outfit.completenessStatus ? <Badge tone={outfit.completenessStatus === "complete" ? "success" : "warning"}>{completenessLabel(outfit.completenessStatus)}</Badge> : null}
        </div>

        <div className="mobile-scrollbar flex gap-2 overflow-x-auto pb-1">
          {outfit.items.map((item) => (
            <div key={item.id} className="w-28 shrink-0 overflow-hidden rounded-xl border border-line bg-surface/80">
              {item.thumbnailUrl || item.imageUrl ? (
                <img src={item.thumbnailUrl || item.imageUrl} alt={item.name} className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-canvas px-2 text-center text-xs text-muted">{item.category}</div>
              )}
              <div className="p-2">
                <p className="truncate text-xs font-semibold text-ink">{item.name}</p>
                <p className="truncate text-[11px] text-muted">{[item.taggedSize, item.garmentFit].filter(Boolean).join(" • ") || item.category}</p>
              </div>
            </div>
          ))}
        </div>

        {safeFitWarnings.length ? (
          <div className="space-y-2 rounded-2xl border border-warning/20 bg-warning/10 p-3">
            {safeFitWarnings.slice(0, 4).map((warning) => (
              <p key={warning} className="text-xs leading-5 text-ink">{warning}</p>
            ))}
          </div>
        ) : null}

        {safeCompletenessWarnings.length ? (
          <div className="space-y-2 rounded-2xl border border-warning/20 bg-warning/10 p-3">
            {safeCompletenessWarnings.slice(0, 4).map((warning) => (
              <p key={warning} className="text-xs leading-5 text-ink">{warning}</p>
            ))}
          </div>
        ) : null}

        {previewStatus === "queued" || previewStatus === "processing" || previewStatus === "generating" ? (
          <div className="space-y-3 rounded-2xl border border-cocoa/15 bg-cocoa/5 p-3">
            <p className="text-sm font-semibold text-cocoa">Creating the on-model try-on. Your Credit is only spent after the saved preview is ready.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {tryOnProgressSteps.map((step, index) => (
                <span key={step} className={`rounded-full px-2 py-1 text-center text-[11px] font-semibold ${index < 6 ? "bg-white/70 text-ink" : "bg-cocoa text-white"}`}>
                  {step}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {previewError ? <p className="rounded-2xl border border-danger/20 bg-danger/5 p-3 text-sm font-semibold text-red-600">{safeTryOnErrorMessage(previewError)}</p> : null}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button type="button" onClick={onGenerateFitLocked} disabled={isGenerating || previewStatus === "generating"}>
            {isGenerating ? "Creating try-on..." : previewUrl ? "Regenerate try-on" : "Generate virtual try-on"}
          </Button>
          {previewUrl && previewStatus === "ready" ? <PreviewDownloadButton outfitId={outfit.id} /> : null}
          <Link href={`/outfit/${outfit.id}/preview`}>
            <Button type="button" variant="secondary" className="w-full">
              <Eye size={16} aria-hidden="true" />
              View full look
            </Button>
          </Link>
          <Link href="/profile?section=appearance">
            <Button type="button" variant="secondary" className="w-full">{setupRequired ? "Set up try-on model" : "Improve size details"}</Button>
          </Link>
          {previewUrl ? (
            <Button type="button" variant="ghost" onClick={onRegenerate} disabled={isGenerating}>
              Try again
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
