"use client";

import Link from "next/link";
import { Eye, Sparkles, WandSparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { simpleFitStatus, simplePreviewType } from "@/lib/copy/simple-copy";
import { completenessLabel } from "@/lib/recommendation/completeness";
import type { AvatarProfileData } from "@/lib/api-client";
import type { OutfitRecommendation, PreviewAccuracySummary, VisualGroundingStatus } from "@/types/outfit";

type DigitalHumanTryOnPanelProps = {
  outfit: OutfitRecommendation;
  avatarProfile?: AvatarProfileData["profile"] | null;
  previewUrl?: string;
  previewStatus?: string;
  previewError?: string;
  previewJobId?: string;
  isGenerating?: boolean;
  accuracyLevel?: PreviewAccuracySummary;
  fitStatus?: string;
  fitConfidence?: number;
  fitWarnings?: string[];
  visualizationWarnings?: string[];
  visualGroundingStatus?: VisualGroundingStatus;
  onOpenPreview?: () => void;
  onGenerateFitLocked?: () => void;
  onRegenerate?: () => void;
};

function fitStatusLabel(status?: string) {
  return simpleFitStatus(status);
}

export function DigitalHumanTryOnPanel({
  outfit,
  avatarProfile,
  previewUrl,
  previewStatus = "not_started",
  previewError = "",
  previewJobId = "",
  isGenerating = false,
  accuracyLevel,
  fitStatus,
  fitConfidence = 0,
  fitWarnings = [],
  visualizationWarnings = [],
  visualGroundingStatus,
  onOpenPreview,
  onGenerateFitLocked,
  onRegenerate
}: DigitalHumanTryOnPanelProps) {
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
                FitPick will use the saved clothing photos to generate a digital human wearing this outfit.
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

        {fitWarnings.length ? (
          <div className="space-y-2 rounded-2xl border border-warning/20 bg-warning/10 p-3">
            {fitWarnings.slice(0, 4).map((warning) => (
              <p key={warning} className="text-xs leading-5 text-ink">{warning}</p>
            ))}
          </div>
        ) : null}

        {outfit.completenessWarnings?.length || visualizationWarnings.length ? (
          <div className="space-y-2 rounded-2xl border border-warning/20 bg-warning/10 p-3">
            {[...(outfit.completenessWarnings || []), ...visualizationWarnings].slice(0, 4).map((warning) => (
              <p key={warning} className="text-xs leading-5 text-ink">{warning}</p>
            ))}
          </div>
        ) : null}

        {previewStatus === "queued" || previewStatus === "processing" || previewStatus === "generating" ? (
          <p className="text-sm font-semibold text-cocoa">Creating the on-model try-on. This may take a moment.</p>
        ) : null}
        {previewError ? <p className="text-sm font-semibold text-red-600">{previewError}</p> : null}

        <details className="rounded-2xl border border-line bg-canvas/60 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink">Preview details</summary>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="neutral">Preview type: {simplePreviewType(accuracyLevel)}</Badge>
            <Badge tone="neutral">Size accuracy {Math.round((fitConfidence || 0) * 100)}%</Badge>
            {visualGroundingStatus ? <Badge tone={visualGroundingStatus === "grounded" ? "success" : "warning"}>{visualGroundingStatus === "grounded" ? "Grounded" : "Needs review"}</Badge> : null}
            {previewJobId ? <Badge tone="neutral">Job {previewJobId.slice(-8)}</Badge> : null}
          </div>
        </details>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button type="button" onClick={onGenerateFitLocked} disabled={isGenerating || previewStatus === "generating"}>
            {isGenerating ? "Creating try-on..." : previewUrl ? "Regenerate try-on" : "Generate virtual try-on"}
          </Button>
          <Link href={`/outfit/${outfit.id}/preview`}>
            <Button type="button" variant="secondary" className="w-full">
              <Eye size={16} aria-hidden="true" />
              View full look
            </Button>
          </Link>
          <Link href="/avatar">
            <Button type="button" variant="secondary" className="w-full">Improve size details</Button>
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
