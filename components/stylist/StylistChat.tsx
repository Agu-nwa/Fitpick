"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ArrowUpRight, Camera, ImagePlus, MessageSquare, Mic, Plus, RefreshCw, Sparkles, Square, UploadCloud, WandSparkles, X, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { ImagePreviewDialog, type ImagePreviewDialogImage } from "@/components/ui/ImagePreviewDialog";
import { PreviewDownloadButton } from "@/components/outfit/PreviewDownloadButton";
import { useRevealContent } from "@/hooks/use-reveal-content";
import { getCreditCost } from "@/lib/credits/credit-costs";
import {
  analyzeReferenceFashionItem,
  clearReferenceFashionItem,
  createReferenceFashionItem,
  getReferenceFashionRecommendations,
  getJobStatus,
  requestSignedUploadUrl,
  selectReferenceFashionItem,
  sendStylistMessage,
  transcribeStylistVoiceNote,
  uploadImageViaServer,
  type RecommendationRegenerationRequest
} from "@/lib/api-client";
import { imageUploadErrorMessage, normalizeImageForUpload, type NormalizedImageUpload } from "@/lib/image-upload/browser-normalize";
import { IMAGE_UPLOAD_POLICY, type ImageUploadSource } from "@/lib/image-upload-policy";
import { buildOutfitPresentationItems } from "@/lib/recommendation/outfit-presentation";
import { safeTryOnErrorMessage, safeUploadErrorMessage, safeUserMessage, safeUserMessages } from "@/lib/user-facing-errors";
import { cn } from "@/lib/utils";
import type { OutfitRecommendation, ReferenceFashionItemSummary, StylistAvatarPreview, StylistResponse, StylistVisualMode } from "@/types/outfit";
import type { WardrobeItem } from "@/types/wardrobe";

type StylistWardrobeAnchor = Pick<WardrobeItem, "id" | "name" | "category" | "imageUrl" | "thumbnailUrl">;

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachment?: {
    type: "reference-fashion-image";
    referenceItemId: string;
    imageUrl: string;
  };
  referenceItem?: ReferenceFashionItemSummary | null;
  referenceRecommendations?: OutfitRecommendation[];
  stylist?: StylistResponse;
  outfit?: OutfitRecommendation | null;
  outfitRecommendationId?: string | null;
  avatarPreview?: StylistAvatarPreview;
  visualMode?: StylistVisualMode;
  visualizationDisclaimer?: string;
  fitLock?: StylistResponse["fitLock"];
  jobId?: string | null;
};

type StylistFlow = "home" | "create" | "match";
type StylistProductMode = "hub" | "create" | "match";

const refinementChips = [
  "More relaxed",
  "More elevated",
  "Add colour",
  "Keep trousers",
  "Keep jacket",
  "Avoid trainers"
];

const virtualTryOnCreditCost = getCreditCost("virtual_try_on");
const maxVoiceNoteSeconds = 60;

type VoiceNoteState = "idle" | "recording" | "transcribing";

function messageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function wardrobeItemId(item: { id?: string; _id?: string }) {
  return String(item.id || item._id || "");
}

function regenerationItemRules(items: OutfitRecommendation["items"], refinement?: string) {
  const instruction = String(refinement || "").toLowerCase();
  const lockedItemIds = items
    .filter((item) => {
      const text = `${item.category || ""} ${item.subcategory || ""} ${item.name || ""}`.toLowerCase();
      if (/keep trousers?/.test(instruction)) return /bottom|trouser|pants|jeans|shorts|skirt/.test(text);
      if (/keep jacket/.test(instruction)) return /outerwear|jacket|blazer|coat|cardigan/.test(text);
      return false;
    })
    .map(wardrobeItemId)
    .filter(Boolean);
  const excludedItemIds = /avoid trainers?/.test(instruction)
    ? items
        .filter((item) => /trainer|sneaker|athletic/.test(`${item.category || ""} ${item.subcategory || ""} ${item.name || ""}`.toLowerCase()))
        .map(wardrobeItemId)
        .filter(Boolean)
    : [];
  return { lockedItemIds, excludedItemIds };
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function compactPreview(preview?: Partial<StylistAvatarPreview>): StylistAvatarPreview {
  return {
    status: preview?.status || "not_started",
    jobId: preview?.jobId ?? null,
    previewId: preview?.previewId ?? null,
    imageUrl: preview?.imageUrl ?? null,
    cacheKey: preview?.cacheKey ?? null,
    errorMessage: preview?.errorMessage ? safeTryOnErrorMessage(preview.errorMessage) : null,
    accuracyLevel: preview?.accuracyLevel,
    fitStatus: preview?.fitStatus,
    fitConfidence: preview?.fitConfidence,
    fitWarnings: preview?.fitWarnings,
    groundedItemIds: preview?.groundedItemIds,
    missingVisualItemIds: preview?.missingVisualItemIds,
    visualizationWarnings: preview?.visualizationWarnings,
    footwearIncluded: preview?.footwearIncluded,
    visualGroundingStatus: preview?.visualGroundingStatus,
    progressiveTrigger: preview?.progressiveTrigger,
    setupPath: preview?.setupPath
  };
}

function referenceLabel(reference?: ReferenceFashionItemSummary | null) {
  if (!reference) return "Selected piece";
  return [reference.primaryColor, reference.subcategory || reference.category].filter(Boolean).join(" ").trim() || "Selected piece";
}

function referenceStatusCopy(reference?: ReferenceFashionItemSummary | null) {
  if (!reference) return "";
  if (reference.status === "analyzing") return "Reading your inspiration...";
  if (reference.status === "needs-selection") return "Choose which item to style.";
  if (reference.status === "ready") return "Your stylist is ready.";
  if (reference.status === "failed") return "Try a clearer photo.";
  return "Photo added.";
}

function StylistProductCard({
  title,
  body,
  action,
  note,
  icon: Icon,
  featured,
  active,
  onClick
}: {
  title: string;
  body: string;
  action: string;
  note?: string;
  icon: LucideIcon;
  featured?: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "focus-ring group min-h-52 w-full min-w-0 overflow-hidden rounded-2xl border p-5 text-left transition hover:-translate-y-0.5",
        featured
          ? "border-cocoa/30 bg-cocoa/10"
          : "border-line bg-surfaceWarm",
        active ? "ring-2 ring-cocoa/30" : "hover:border-cocoa/35"
      )}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className={cn("inline-flex size-11 items-center justify-center rounded-xl", featured ? "bg-cocoa text-white" : "bg-canvasSubtle text-cocoa")}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="mt-5 block max-w-full break-words font-editorial text-3xl font-semibold leading-none text-ink">{title}</span>
      <span className="mt-3 block max-w-full text-sm leading-6 text-muted">{body}</span>
      {note ? <span className="mt-4 block max-w-full text-xs font-bold uppercase tracking-[0.14em] text-cocoa sm:tracking-[0.16em]">{note}</span> : null}
      <span className="mt-5 inline-flex max-w-full items-center gap-2 text-sm font-semibold text-ink">
        {action}
        <ArrowUpRight size={16} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
      </span>
    </button>
  );
}

function MatchFlowVisual() {
  const steps = ["Photo", "Closet options", "Styled look"];
  return (
    <div className="grid min-w-0 grid-cols-3 gap-2" aria-label="Match an Outfit flow">
      {steps.map((step, index) => (
        <div key={step} className="min-w-0 rounded-2xl border border-line bg-white/65 px-2 py-3 text-center sm:px-3">
          <span className="mx-auto flex size-8 items-center justify-center rounded-full bg-olive/10 text-xs font-bold text-olive">{index + 1}</span>
          <p className="mt-2 truncate text-[10px] font-bold uppercase tracking-[0.08em] text-muted sm:text-[11px] sm:tracking-[0.12em]">{step}</p>
        </div>
      ))}
    </div>
  );
}

function DetectedPiecesPanel({
  reference,
  busy
}: {
  reference?: ReferenceFashionItemSummary | null;
  busy?: boolean;
}) {
  if (!reference && !busy) return null;
  const pieces = reference?.detectedItems?.length
    ? reference.detectedItems
    : reference
      ? [{
          id: reference.id,
          label: referenceLabel(reference),
          category: reference.category,
          subcategory: reference.subcategory,
          primaryColor: reference.primaryColor,
          confidence: undefined
        }]
      : [];

  return (
    <div className="min-w-0 rounded-2xl border border-line bg-canvas/65 p-3">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-semibold text-ink">Pieces in your inspiration</p>
        <Badge tone={reference?.status === "ready" ? "success" : busy ? "premium" : "neutral"}>
          {busy ? "Studying" : reference?.status === "ready" ? "Ready" : "Reviewing"}
        </Badge>
      </div>
      {busy && !pieces.length ? (
        <p className="mt-3 text-sm leading-6 text-muted">Reading your inspiration...</p>
      ) : (
        <div className="mt-3 grid gap-2">
          {pieces.slice(0, 5).map((item) => (
            <div key={item.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-line bg-surface/80 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{item.label}</p>
                <p className="truncate text-xs text-muted">{[item.primaryColor, item.subcategory || item.category].filter(Boolean).join(" • ") || "Fashion piece"}</p>
              </div>
              {reference?.selectedDetectedItemId === item.id ? <Badge tone="success">Selected</Badge> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReferenceImageCard({
  reference,
  onClear,
  busy
}: {
  reference: ReferenceFashionItemSummary;
  onClear?: () => void;
  busy?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-cocoa/15 bg-canvas/70 p-3">
      <div className="flex min-w-0 gap-3">
        <ImageFrame
          src={reference.imageUrl}
          alt={`${referenceLabel(reference)} reference`}
          placeholder={reference.category || "Photo"}
          className="h-20 w-20 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cocoa">Inspiration photo</p>
          <p className="mt-1 truncate text-sm font-semibold text-ink">{referenceLabel(reference)}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{referenceStatusCopy(reference)}</p>
          <div className="mt-2 flex min-w-0 flex-wrap gap-2">
            {reference.category ? <Badge tone="neutral">{reference.category}</Badge> : null}
            {reference.formality ? <Badge tone="neutral">{reference.formality}</Badge> : null}
            {reference.usableForTryOn ? <Badge tone="success">Ready</Badge> : null}
          </div>
        </div>
        {onClear ? (
          <button
            type="button"
            className="focus-ring inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted hover:text-ink"
            onClick={onClear}
            aria-label="Remove photo"
            disabled={busy}
          >
            <X size={15} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {reference.warnings?.length ? (
        <div className="mt-3 space-y-1 rounded-xl border border-warning/20 bg-warning/10 p-2">
          {safeUserMessages(reference.warnings).slice(0, 2).map((warning) => (
            <p key={warning} className="text-xs leading-5 text-ink">{warning}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ReferenceSelectionCard({
  reference,
  onSelect,
  busy
}: {
  reference: ReferenceFashionItemSummary;
  onSelect: (detectedItemId: string) => void;
  busy?: boolean;
}) {
  if (!reference.detectedItems?.length) return null;
  return (
    <div className="rounded-2xl border border-cocoa/20 bg-cocoa/10 p-3">
      <p className="text-sm font-semibold text-ink">Which item would you like me to style?</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {reference.detectedItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className="focus-ring rounded-2xl border border-line bg-surface px-3 py-3 text-left text-sm font-semibold text-ink transition hover:border-cocoa/40 disabled:opacity-60"
            onClick={() => onSelect(item.id)}
            disabled={busy}
          >
            {item.label}
            <span className="mt-1 block text-[11px] font-medium text-muted">{[item.primaryColor, item.category].filter(Boolean).join(" • ") || "Fashion item"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function EditorialOutfitVisual({
  outfit,
  featured,
  preview,
  reference
}: {
  outfit: OutfitRecommendation;
  featured?: boolean;
  preview?: StylistAvatarPreview;
  reference?: ReferenceFashionItemSummary | null;
}) {
  if (featured && preview?.imageUrl) {
    return (
      <div className="relative overflow-hidden rounded-[1.5rem]">
        <ImageFrame
          src={preview.imageUrl}
          alt={`${outfit.title} virtual try-on preview`}
          placeholder={outfit.title}
          className="min-h-[32rem] rounded-[1.5rem] border-0 bg-canvas sm:min-h-[42rem]"
        />
        {reference?.imageUrl ? (
          <div className="absolute bottom-3 right-3 w-24 rounded-2xl border border-white/80 bg-surface/90 p-1.5 shadow-card backdrop-blur sm:w-32">
            <ImageFrame
              src={reference.imageUrl}
              alt={`Uploaded item: ${referenceLabel(reference)}`}
              aspect="square"
              fit="contain"
              placeholder={reference.category || "Uploaded item"}
              className="rounded-xl border-0 bg-canvas"
            />
            <p className="mt-1 truncate px-1 text-[9px] font-bold uppercase tracking-[0.12em] text-cocoa">Uploaded item</p>
          </div>
        ) : null}
      </div>
    );
  }

  const images = buildOutfitPresentationItems(outfit, reference);
  if (!images.length) {
    return (
      <div className={cn(
        "flex items-center justify-center rounded-[1.5rem] border border-dashed border-line bg-canvas/70 px-6 text-center",
        featured ? "min-h-[32rem] sm:min-h-[42rem]" : "min-h-[24rem] sm:min-h-[30rem]"
      )}>
        <p className="font-editorial text-3xl font-semibold leading-none text-ink">Curated from your closet</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "grid overflow-hidden rounded-[1.5rem] border border-line bg-canvas/70 p-2",
      featured ? "min-h-[32rem] grid-cols-2 gap-2 sm:min-h-[42rem] sm:grid-cols-3" : "min-h-[24rem] grid-cols-2 gap-2 sm:min-h-[30rem] sm:grid-cols-3"
    )}>
      {images.map((item, index) => (
        <div
          key={item.key}
          className={cn(
            "relative min-h-28 overflow-hidden rounded-2xl bg-surface",
            index === 0 ? "col-span-2 row-span-2 min-h-72 sm:col-span-2" : ""
          )}
        >
          <ImageFrame
            src={item.imageUrl || undefined}
            alt={item.source === "reference-upload" ? `Uploaded item: ${item.name}` : item.name}
            placeholder={item.category}
            fit={item.source === "reference-upload" || /shoes|bags|accessories/i.test(item.category) ? "contain" : "cover"}
            className={cn(
              "h-full min-h-28 rounded-2xl border-0 bg-surface",
              index === 0 ? "min-h-72" : "",
              !item.imageUrl ? "border border-dashed border-line" : ""
            )}
          />
          {item.source === "reference-upload" ? (
            <p className="absolute bottom-2 left-2 rounded-full border border-white/75 bg-surface/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-cocoa shadow-soft backdrop-blur">
              Uploaded item
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function RecommendationDetailsDrawer({
  outfit,
  reference,
  assistantNote,
  open,
  onClose
}: {
  outfit: OutfitRecommendation;
  reference?: ReferenceFashionItemSummary | null;
  assistantNote?: string;
  open: boolean;
  onClose: () => void;
}) {
  const [viewingImage, setViewingImage] = useState<ImagePreviewDialogImage | null>(null);

  if (!open) return null;
  const notes = [outfit.summary, outfit.occasionFit, outfit.colorNote, assistantNote].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/35 px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-sm lg:items-center lg:justify-end lg:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Look details"
        className="max-h-[88svh] w-full overflow-y-auto rounded-[1.75rem] border border-line bg-surface p-4 shadow-card lg:max-w-xl lg:p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cocoa">Look details</p>
            <h3 className="font-editorial mt-2 text-3xl font-semibold leading-none text-ink">{outfit.title}</h3>
          </div>
          <button
            type="button"
            className="focus-ring inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-canvas text-muted hover:text-ink"
            onClick={onClose}
            aria-label="Close look details"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {reference ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Uploaded item</p>
              <div className="mt-2 rounded-2xl border border-cocoa/20 bg-cocoa/10 p-3">
                <ReferenceImageCard reference={reference} />
              </div>
            </div>
          ) : null}

          {outfit.items.length ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Closet items</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {outfit.items.map((item) => (
                  <div key={item.id} className="overflow-hidden rounded-2xl border border-line bg-canvas/70">
                    <button
                      type="button"
                      className="focus-ring block w-full text-left"
                      onClick={() => {
                        const src = item.thumbnailUrl || item.imageUrl;
                        if (!src) return;
                        setViewingImage({
                          src,
                          alt: item.name,
                          title: item.name,
                          subtitle: [item.color, item.category].filter(Boolean).join(" · ")
                        });
                      }}
                      aria-label={`View ${item.name}`}
                    >
                      <ImageFrame
                        src={item.thumbnailUrl || item.imageUrl}
                        alt={item.name}
                        placeholder={item.category}
                        className="h-28 rounded-none border-0"
                      />
                    </button>
                    <div className="px-3 py-2">
                      <p className="truncate text-xs font-semibold text-ink">{item.name}</p>
                      <p className="truncate text-[11px] text-muted">{[item.color, item.category].filter(Boolean).join(" • ")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {notes.length ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Styling notes</p>
              <div className="mt-2 space-y-3 rounded-2xl border border-line bg-canvas/65 p-4">
                {notes.slice(0, 4).map((note, index) => (
                  <p key={`${note}-${index}`} className="text-sm leading-6 text-muted">{note}</p>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            {outfit.occasion ? <Badge tone="neutral">{outfit.occasion}</Badge> : null}
            {outfit.weatherFit ? <Badge tone="neutral">{outfit.weatherFit}</Badge> : null}
          </div>
        </div>
      </section>
      <ImagePreviewDialog image={viewingImage} onClose={() => setViewingImage(null)} />
    </div>
  );
}

function EditorialRecommendationCard({
  outfit,
  index,
  loading,
  preview,
  assistantNote,
  reference,
  origin,
  onRegenerate,
  showRegenerate,
  showRefinementChips
}: {
  outfit: OutfitRecommendation;
  index: number;
  loading?: boolean;
  preview?: StylistAvatarPreview;
  assistantNote?: string;
  reference?: ReferenceFashionItemSummary | null;
  origin: "create_look" | "match";
  onRegenerate?: (refinement?: string) => void;
  showRegenerate?: boolean;
  showRefinementChips?: boolean;
}) {
  const featured = index === 0;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const previewReady = featured && Boolean(preview?.imageUrl);

  return (
    <article
      className={cn(
        "w-full overflow-hidden rounded-2xl border bg-surfaceWarm p-3 transition sm:p-5",
        featured ? "border-cocoa/25" : "border-line"
      )}
    >
      <div className="relative">
        {featured ? (
          <p className="absolute left-4 top-4 z-10 rounded-full border border-line bg-surfaceWarm/95 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-cocoa">
            {reference ? "Best Match" : "Editor's Pick"}
          </p>
        ) : null}
        <EditorialOutfitVisual outfit={outfit} featured={featured} preview={featured ? preview : undefined} reference={reference} />
      </div>
      <div className="grid gap-5 px-1 py-5 sm:px-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          {reference ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-cocoa">Styled Around Your Item</p> : null}
          <h4 className={cn("font-editorial font-semibold leading-[1.02] text-ink", featured ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl")}>
            {outfit.title}
          </h4>
          {outfit.summary ? <p className="mt-3 max-w-xl truncate text-sm leading-6 text-muted">{outfit.summary}</p> : null}
        </div>
        <div className="grid gap-2 lg:min-w-80">
          {showRegenerate && onRegenerate ? (
            <Button type="button" variant="secondary" onClick={() => onRegenerate()} disabled={loading}>
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden="true" />
              {loading ? "Regenerating..." : "Regenerate Look"}
            </Button>
          ) : null}
          <Link href={`/outfit/${outfit.id}/preview?origin=${origin}`} className="block">
            <Button type="button" className="w-full">
              Try this outfit on · {virtualTryOnCreditCost} Credits
            </Button>
          </Link>
          {previewReady ? <PreviewDownloadButton outfitId={outfit.id} /> : null}
          <Button type="button" variant="ghost" onClick={() => setDetailsOpen(true)}>
            View Details
          </Button>
        </div>
      </div>

      {showRegenerate && onRegenerate && showRefinementChips ? (
        <div className="border-t border-line/70 px-1 py-4 sm:px-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Refine the next look</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {refinementChips.map((chip) => (
              <button
                key={chip}
                type="button"
                className="focus-ring rounded-full border border-line bg-canvas/70 px-3 py-2 text-xs font-semibold text-muted transition hover:border-cocoa/40 hover:text-ink disabled:opacity-60"
                onClick={() => onRegenerate(chip)}
                disabled={loading}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <RecommendationDetailsDrawer outfit={outfit} reference={reference} assistantNote={assistantNote} open={detailsOpen} onClose={() => setDetailsOpen(false)} />
    </article>
  );
}

function EditorialRecommendationStack({
  recommendations,
  mode,
  loading,
  preview,
  assistantNote,
  reference,
  onRegenerate
}: {
  recommendations: OutfitRecommendation[];
  mode: "create" | "match";
  loading?: boolean;
  preview?: StylistAvatarPreview;
  assistantNote?: string;
  reference?: ReferenceFashionItemSummary | null;
  onRegenerate?: (refinement?: string) => void;
}) {
  if (!recommendations.length) return null;

  return (
    <div className="space-y-4">
      {recommendations.slice(0, 1).map((outfit, index) => (
        <EditorialRecommendationCard
          key={outfit.id || `${outfit.title}-${index}`}
          outfit={outfit}
          index={index}
          loading={loading}
          preview={index === 0 ? preview : undefined}
          assistantNote={index === 0 ? assistantNote : undefined}
          reference={index === 0 ? reference : null}
          origin={mode === "match" ? "match" : "create_look"}
          onRegenerate={onRegenerate}
          showRegenerate={Boolean(onRegenerate) && index === 0}
          showRefinementChips={mode === "create"}
        />
      ))}
    </div>
  );
}

export function StylistChat({
  initialFlow = "home",
  productMode = "hub",
  initialWardrobeItem = null
}: {
  initialFlow?: StylistFlow;
  productMode?: StylistProductMode;
  initialWardrobeItem?: StylistWardrobeAnchor | null;
} = {}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const lookStudioRef = useRef<HTMLDivElement>(null);
  const lastReferenceFileRef = useRef<{ file: File; source: "camera" | "upload" } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceTimerRef = useRef<number | null>(null);
  const discardVoiceNoteRef = useRef(false);
  const conversationIdRef = useRef(`stylist-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const revealContent = useRevealContent();
  const [activeFlow, setActiveFlow] = useState<StylistFlow>(initialFlow);
  const anchoredItemId = initialWardrobeItem?.id || "";
  const initialAnchorPrompt = initialWardrobeItem ? `Build a complete outfit around my ${initialWardrobeItem.name}.` : "";
  const workspaceStorageKey = `fitpick:stylist-workspace:${productMode}`;
  const [message, setMessage] = useState(initialAnchorPrompt);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRegeneratingLooks, setIsRegeneratingLooks] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filePickerSource, setFilePickerSource] = useState<"camera" | "upload">("upload");
  const [referenceBusy, setReferenceBusy] = useState(false);
  const [referenceMessage, setReferenceMessage] = useState("");
  const [referencePreviewUrl, setReferencePreviewUrl] = useState("");
  const [activeReference, setActiveReference] = useState<ReferenceFashionItemSummary | null>(null);
  const [canRetryReferenceUpload, setCanRetryReferenceUpload] = useState(false);
  const [lastCreateBrief, setLastCreateBrief] = useState("");
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceNoteState>("idle");
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [voiceError, setVoiceError] = useState("");
  const currentFlow = productMode === "create" || productMode === "match" ? productMode : activeFlow;
  const recentMessages = useMemo(() => messages.slice(-8), [messages]);
  const latestLook = useMemo(
    () => [...messages].reverse().find((entry) => entry.role === "assistant" && (entry.outfit || entry.outfitRecommendationId)),
    [messages]
  );
  const requestHistory = useMemo(
    () => messages.filter((entry) => entry.role === "user").slice(-3).reverse(),
    [messages]
  );

  useEffect(() => {
    return () => {
      if (referencePreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(referencePreviewUrl);
    };
  }, [referencePreviewUrl]);

  useEffect(() => {
    setVoiceSupported(Boolean(
      typeof window !== "undefined"
      && window.MediaRecorder
      && navigator.mediaDevices?.getUserMedia
    ));

    return () => {
      if (voiceTimerRef.current !== null) window.clearInterval(voiceTimerRef.current);
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (voiceState === "recording" && voiceSeconds >= maxVoiceNoteSeconds) {
      stopVoiceRecording();
    }
  }, [voiceSeconds, voiceState]);

  useEffect(() => {
    if (initialWardrobeItem || typeof window === "undefined") {
      setWorkspaceReady(true);
      return;
    }
    try {
      const stored = window.sessionStorage.getItem(workspaceStorageKey);
      if (stored) {
        const workspace = JSON.parse(stored) as {
          activeFlow?: StylistFlow;
          message?: string;
          messages?: ChatMessage[];
          activeReference?: ReferenceFashionItemSummary | null;
          lastCreateBrief?: string;
        };
        if (workspace.activeFlow) setActiveFlow(workspace.activeFlow);
        if (typeof workspace.message === "string") setMessage(workspace.message);
        if (Array.isArray(workspace.messages)) setMessages(workspace.messages.slice(-12));
        if (workspace.activeReference) setActiveReference(workspace.activeReference);
        if (typeof workspace.lastCreateBrief === "string") setLastCreateBrief(workspace.lastCreateBrief);
      }
    } catch {
      window.sessionStorage.removeItem(workspaceStorageKey);
    }
    setWorkspaceReady(true);
  }, [initialWardrobeItem, workspaceStorageKey]);

  useEffect(() => {
    if (!workspaceReady || typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(workspaceStorageKey, JSON.stringify({
        activeFlow,
        message,
        messages: messages.slice(-12),
        activeReference,
        lastCreateBrief
      }));
    } catch {
      // A full recommendation can exceed browser storage limits. The active
      // in-memory workspace remains usable even when persistence is unavailable.
    }
  }, [activeFlow, activeReference, lastCreateBrief, message, messages, workspaceReady, workspaceStorageKey]);

  function focusWorkspace() {
    revealContent(workspaceRef, { delayMs: 40, topOffset: 24, bottomOffset: 136 });
  }

  function chooseFlow(flow: StylistFlow) {
    setActiveFlow(flow);
    focusWorkspace();
  }

  function openReferencePicker(source: "camera" | "upload") {
    setPickerOpen(false);
    if (productMode === "hub") setActiveFlow("match");
    setFilePickerSource(source);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  }

  function patchMessage(id: string, patch: Partial<ChatMessage>) {
    setMessages((current) => current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  function showToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(""), 1800);
  }

  function clearVoiceTimer() {
    if (voiceTimerRef.current !== null) {
      window.clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
  }

  function stopVoiceStream() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }

  function preferredRecordingMimeType() {
    const formats = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
    return formats.find((format) => MediaRecorder.isTypeSupported(format)) || "";
  }

  async function finishVoiceTranscription(audio: Blob) {
    setVoiceState("transcribing");
    const result = await transcribeStylistVoiceNote(audio);
    if (!result.ok) {
      setVoiceError(result.error.message || "I couldn't transcribe that voice note. Try again or type your request.");
      setVoiceState("idle");
      return;
    }

    setMessage((current) => {
      const existing = current.trim();
      const combined = existing ? `${existing} ${result.data.text}` : result.data.text;
      return combined.slice(0, 800);
    });
    setVoiceState("idle");
    showToast(result.data.truncated ? "Voice note added. Review the shortened transcript before sending." : "Voice note added. Review it before sending.");
  }

  async function startVoiceRecording() {
    setVoiceError("");
    if (!voiceSupported) {
      setVoiceError("Voice recording is not available in this browser. You can still type your request.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      mediaStreamRef.current = stream;
      const mimeType = preferredRecordingMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      voiceChunksRef.current = [];
      discardVoiceNoteRef.current = false;
      setVoiceSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) voiceChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        clearVoiceTimer();
        stopVoiceStream();
        setVoiceState("idle");
        setVoiceError("The recording stopped unexpectedly. Try again or type your request.");
      };
      recorder.onstop = () => {
        clearVoiceTimer();
        stopVoiceStream();
        mediaRecorderRef.current = null;
        if (discardVoiceNoteRef.current) {
          voiceChunksRef.current = [];
          setVoiceState("idle");
          setVoiceSeconds(0);
          return;
        }
        const recordingType = recorder.mimeType || voiceChunksRef.current[0]?.type || "audio/webm";
        const audio = new Blob(voiceChunksRef.current, { type: recordingType });
        voiceChunksRef.current = [];
        if (audio.size < 512) {
          setVoiceState("idle");
          setVoiceError("That voice note was too short. Try recording again.");
          return;
        }
        void finishVoiceTranscription(audio);
      };

      recorder.start(250);
      setVoiceState("recording");
      voiceTimerRef.current = window.setInterval(() => {
        setVoiceSeconds((current) => Math.min(current + 1, maxVoiceNoteSeconds));
      }, 1000);
    } catch (recordingError) {
      stopVoiceStream();
      setVoiceState("idle");
      const permissionDenied = recordingError instanceof DOMException
        && (recordingError.name === "NotAllowedError" || recordingError.name === "SecurityError");
      setVoiceError(permissionDenied
        ? "Microphone access was blocked. Allow microphone access in your browser settings, then try again."
        : "I couldn't start the microphone. Try again or type your request.");
    }
  }

  function stopVoiceRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
  }

  function cancelVoiceRecording() {
    discardVoiceNoteRef.current = true;
    stopVoiceRecording();
  }

  function formattedVoiceTime(seconds: number) {
    return `0:${String(seconds).padStart(2, "0")}`;
  }

  async function uploadReferenceImage(normalized: NormalizedImageUpload, source: "camera" | "upload") {
    const file = normalized.file;
    const mimeType = file.type || IMAGE_UPLOAD_POLICY.acceptedOutputMimeType;
    const makePayload = (input: { publicUrl: string; storageKey: string; filename?: string; mimeType?: string; sizeBytes?: number; width?: number; height?: number }) => ({
      conversationId: conversationIdRef.current,
      imageUrl: input.publicUrl,
      storageKey: input.storageKey,
      source,
      filename: input.filename || file.name,
      mimeType: input.mimeType || mimeType,
      sizeBytes: input.sizeBytes || file.size,
      ...(input.width || normalized.width ? { width: input.width || normalized.width } : {}),
      ...(input.height || normalized.height ? { height: input.height || normalized.height } : {})
    });

    if (normalized.serverNormalizationRequired) {
      const fallback = await uploadImageViaServer({ file, purpose: "stylist_reference" });
      if (!fallback.ok) {
        throw new Error(safeUploadErrorMessage(fallback.error, "We couldn’t upload that image. Try another photo."));
      }
      const created = await createReferenceFashionItem(makePayload({
        publicUrl: fallback.data.upload.publicUrl,
        storageKey: fallback.data.upload.storageKey,
        filename: fallback.data.upload.filename,
        mimeType: fallback.data.upload.mimeType,
        sizeBytes: fallback.data.upload.sizeBytes,
        width: fallback.data.upload.width,
        height: fallback.data.upload.height
      }));
      if (!created.ok) throw new Error(safeUserMessage(created.error, "We couldn’t upload that image. Try another photo."));
      return created.data.referenceItem;
    }

    const signed = await requestSignedUploadUrl({
      filename: file.name,
      mimeType,
      sizeBytes: file.size,
      purpose: "stylist_reference"
    });

    if (signed.ok && signed.data.upload.ready && signed.data.upload.uploadUrl) {
      try {
        const uploaded = await fetch(signed.data.upload.uploadUrl, {
          method: signed.data.upload.method || "PUT",
          headers: signed.data.upload.headers || { "content-type": mimeType },
          body: file
        });
        if (uploaded.ok) {
          const created = await createReferenceFashionItem(makePayload({
            publicUrl: signed.data.upload.publicUrl || "",
            storageKey: signed.data.upload.storageKey
          }));
          if (created.ok) return created.data.referenceItem;
          throw new Error(safeUserMessage(created.error, "We couldn’t upload that image. Try another photo."));
        }
      } catch {
        // Fall back to the server upload route below.
      }
    }

    const fallback = await uploadImageViaServer({ file, purpose: "stylist_reference" });
    if (!fallback.ok) {
      throw new Error(safeUploadErrorMessage(fallback.error, "We couldn’t upload that image. Try another photo."));
    }

    const created = await createReferenceFashionItem(makePayload({
      publicUrl: fallback.data.upload.publicUrl,
      storageKey: fallback.data.upload.storageKey
    }));
    if (!created.ok) throw new Error(safeUserMessage(created.error, "We couldn’t upload that image. Try another photo."));
    return created.data.referenceItem;
  }

  async function handleReferenceFile(file: File | null, source = filePickerSource) {
    if (!file || referenceBusy) return;

    lastReferenceFileRef.current = { file, source };
    setCanRetryReferenceUpload(false);
    setReferenceBusy(true);
    setReferenceMessage("Preparing photo...");
    setError("");

    try {
      const normalized = await normalizeImageForUpload(file, {
        source: source === "camera" ? "camera" : "gallery" as ImageUploadSource,
        onStage: (stage) => {
          if (stage === "validating") setReferenceMessage("Checking photo...");
          if (stage === "converting") setReferenceMessage("Preparing iPhone photo...");
          if (stage === "uploading") setReferenceMessage("Uploading photo...");
        }
      });
      if (referencePreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(referencePreviewUrl);
      setReferencePreviewUrl(normalized.previewUrl);
      setReferenceMessage("Uploading photo...");

      const created = await uploadReferenceImage(normalized, source);
      setActiveReference(created);
      setReferencePreviewUrl(created?.imageUrl || normalized.previewUrl);
      setReferenceMessage("Reading your inspiration...");
      setActiveFlow("match");
      focusWorkspace();
      setCanRetryReferenceUpload(false);

      if (!created?.id) throw new Error("We couldn’t upload that image. Try another photo.");
      const analyzed = await analyzeReferenceFashionItem(created.id);
      if (analyzed.ok) {
        setActiveReference(analyzed.data.referenceItem);
        setReferencePreviewUrl(analyzed.data.referenceItem?.imageUrl || created.imageUrl);
        setReferenceMessage(analyzed.data.referenceItem?.status === "needs-selection" ? "Choose which item to style." : "Photo ready.");
        focusWorkspace();
      } else {
        setReferenceMessage(safeUserMessage(analyzed.error, "I couldn’t clearly identify the fashion item in this image. Try another photo."));
      }
    } catch (uploadError) {
      setReferenceMessage(imageUploadErrorMessage(uploadError) || safeUploadErrorMessage(uploadError, "We couldn’t upload that image. Try another photo."));
      setActiveReference(null);
      setCanRetryReferenceUpload(true);
    } finally {
      setReferenceBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleReferenceFiles(files: FileList | null) {
    await handleReferenceFile(files?.[0] || null);
  }

  async function retryReferenceUpload() {
    const retry = lastReferenceFileRef.current;
    if (!retry) {
      setPickerOpen(true);
      return;
    }
    setFilePickerSource(retry.source);
    await handleReferenceFile(retry.file, retry.source);
  }

  async function clearActiveReference() {
    const referenceId = activeReference?.id;
    setActiveReference(null);
    setReferenceMessage("");
    setCanRetryReferenceUpload(false);
    lastReferenceFileRef.current = null;
    if (referencePreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(referencePreviewUrl);
    setReferencePreviewUrl("");
    if (referenceId) void clearReferenceFashionItem(referenceId);
  }

  function startNewConversation() {
    if (loading || referenceBusy || isRegeneratingLooks) return;
    void clearActiveReference();
    conversationIdRef.current = `stylist-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setMessages([]);
    setMessage("");
    setError("");
    setToast("");
    setLastCreateBrief("");
    setActiveFlow(initialFlow);
    if (typeof window !== "undefined") window.sessionStorage.removeItem(workspaceStorageKey);
    window.requestAnimationFrame(() => document.getElementById("stylist-agent-prompt")?.focus());
  }

  async function chooseDetectedReference(detectedItemId: string) {
    if (!activeReference?.id) return;
    setReferenceBusy(true);
    setReferenceMessage("Updating photo...");
    const result = await selectReferenceFashionItem(activeReference.id, detectedItemId);
    setReferenceBusy(false);
    if (!result.ok) {
      setReferenceMessage(safeUserMessage(result.error, "Unable to select that item right now."));
      return;
    }
    setActiveReference(result.data.referenceItem);
    setReferenceMessage("Photo ready.");
    focusWorkspace();
  }

  async function pollAvatarJob(messageIdToPatch: string, jobId: string) {
    let activeJobId = jobId;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await wait(2500);
      const result = await getJobStatus(activeJobId);
      if (!result.ok) continue;

      const job = result.data.job;
      if (job.status === "completed") {
        const preview = job.result?.preview || {};
        const validationJobId = String(job.result?.validationJobId || "");
        if (job.result?.validationPending || preview.validationStatus === "pending" || preview.status === "generating") {
          patchMessage(messageIdToPatch, {
            avatarPreview: compactPreview({
              status: "generating",
              previewId: preview.id || null,
              imageUrl: preview.imageUrl || preview.previewUrl || null,
              cacheKey: preview.cacheKey || null,
              errorMessage: null
            }),
            jobId: validationJobId || activeJobId
          });
          if (validationJobId) activeJobId = validationJobId;
          continue;
        }
        patchMessage(messageIdToPatch, {
          avatarPreview: compactPreview({
            status: "ready",
            previewId: preview.id || null,
            imageUrl: preview.imageUrl || preview.previewUrl || null,
            cacheKey: preview.cacheKey || null,
            errorMessage: null,
            accuracyLevel: preview.accuracyLevel,
            fitStatus: preview.fitStatus,
            fitConfidence: preview.fitConfidence,
            fitWarnings: preview.fitWarnings
          }),
          jobId: null
        });
        showToast("Virtual Try-On ready.");
        return;
      }

      if (job.status === "failed" || job.status === "cancelled") {
        patchMessage(messageIdToPatch, {
          avatarPreview: compactPreview({
            status: "failed",
            errorMessage: safeTryOnErrorMessage(job.errorMessage, "We couldn’t complete that right now. Please try again.")
          }),
          jobId: null
        });
        return;
      }

      patchMessage(messageIdToPatch, {
        avatarPreview: compactPreview({
          status: job.status === "queued" ? "queued" : "generating",
          jobId
        }),
        jobId
      });
    }

    patchMessage(messageIdToPatch, {
      avatarPreview: compactPreview({
        status: "generating",
        jobId,
        errorMessage: "This preview is still being prepared. Check back shortly."
      }),
      jobId
    });
  }

  async function submitStylistMessage(text?: string, options: { includeVisualization?: boolean; visualMode?: StylistVisualMode; isRegeneration?: boolean; regeneration?: RecommendationRegenerationRequest } = {}) {
    const trimmed = (text ?? message).trim();
    const referenceForMessage = activeReference?.status === "ready" ? activeReference : null;
    const flowForRequest = referenceForMessage ? "match" : currentFlow;
    if (referenceForMessage && productMode === "hub") setActiveFlow("match");
    if ((!trimmed && !referenceForMessage) || loading || referenceBusy) return;
    if (activeReference?.status === "needs-selection") {
      setError("Choose the item you want MyFitPick to style first.");
      return;
    }
    if (activeReference?.status === "failed") {
      setError("Try a clearer photo before asking MyFitPick to style it.");
      return;
    }

    const promptText = trimmed || "Style this photo with my closet.";
    const userEntry: ChatMessage = {
      id: messageId(),
      role: "user",
      content: promptText,
      referenceItem: referenceForMessage,
      attachment: referenceForMessage
        ? {
            type: "reference-fashion-image",
            referenceItemId: referenceForMessage.id,
            imageUrl: referenceForMessage.imageUrl
          }
        : undefined
    };
    const assistantId = messageId();
    const assistantEntry: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: flowForRequest === "match" ? "MyFitPick is finding closet matches." : "MyFitPick is styling your look."
    };
    const sessionMessages = [...messages, userEntry, assistantEntry];

    setLoading(true);
    setError("");
    setMessage("");
    if (flowForRequest === "create" && !options.isRegeneration) setLastCreateBrief(promptText);
    setMessages(sessionMessages);
    revealContent(lookStudioRef, { delayMs: 120, topOffset: 24, bottomOffset: 136 });

    const shouldIncludeVisualization = options.includeVisualization === true;
    const response = await sendStylistMessage(promptText, {
      includeVisualization: shouldIncludeVisualization,
      visualMode: shouldIncludeVisualization ? options.visualMode || "digital_human" : "none",
      referenceItemId: referenceForMessage?.id || null,
      recentMessages: recentMessages.map((entry) => ({ role: entry.role, content: entry.content })),
      regeneration: options.regeneration || (anchoredItemId ? {
        requestKind: "anchor",
        previousItemIds: [anchoredItemId],
        lockedItemIds: [anchoredItemId],
        minimumCoreChanges: 1,
        maximumOverlap: 0.8
      } : undefined)
    });

    setLoading(false);

    if (!response.ok) {
      const safeMessage = safeUserMessage(response.error, "We couldn’t complete that right now. Please try again.");
      setError(safeMessage);
      patchMessage(assistantId, { content: safeMessage });
      return;
    }

    const avatarPreview = compactPreview(response.data.avatarPreview || response.data.stylist.avatarPreview);
    const jobId = response.data.job?.id || avatarPreview.jobId || null;
    patchMessage(assistantId, {
      content: response.data.reply,
      referenceItem: response.data.referenceItem || referenceForMessage,
      referenceRecommendations: response.data.referenceRecommendations || [],
      stylist: response.data.stylist,
      outfit: response.data.outfit,
      outfitRecommendationId: response.data.outfitRecommendationId,
      avatarPreview,
      visualMode: response.data.visualization?.visualMode || response.data.stylist.visualMode || "none",
      visualizationDisclaimer: response.data.visualization?.visualizationDisclaimer || response.data.stylist.visualizationDisclaimer,
      fitLock: response.data.visualization?.fitLock || response.data.stylist.fitLock,
      jobId
    });
    revealContent(lookStudioRef, { delayMs: 120, topOffset: 24, bottomOffset: 136 });

    const shouldFollowRedirect = Boolean(response.data.redirectTo && productMode !== "create");

    if (jobId && avatarPreview.status !== "ready" && !shouldFollowRedirect) {
      void pollAvatarJob(assistantId, jobId);
    }

    if (response.data.outfitRecommendationId && !referenceForMessage) {
      showToast(productMode === "create" ? "Your look is ready." : "MyFitPick is preparing your look.");
      if (shouldFollowRedirect && response.data.redirectTo) router.push(response.data.redirectTo);
    }
  }

  async function handleRegenerateLooks(entry: ChatMessage, refinement?: string) {
    if (loading || referenceBusy || isRegeneratingLooks) return;
    const originalBrief = lastCreateBrief || requestHistory.find((request) => !request.attachment)?.content || "Create a polished look from my wardrobe.";
    const currentItems = entry.outfit?.items.map((item) => item.name).filter(Boolean).join(", ");
    const previousItemIds = (entry.outfit?.items || []).map(wardrobeItemId).filter(Boolean);
    const itemRules = regenerationItemRules(entry.outfit?.items || [], refinement);
    const refinementLine = refinement ? `\nRefinement: ${refinement}.` : "";
    const regenerationPrompt = currentItems
      ? `${originalBrief}${refinementLine}\nCreate a fresh alternative from my wardrobe and avoid repeating this exact combination: ${currentItems}.`
      : `${originalBrief}${refinementLine}\nCreate a fresh alternative from my wardrobe.`;

    setIsRegeneratingLooks(true);
    try {
      await submitStylistMessage(regenerationPrompt, {
        includeVisualization: false,
        visualMode: "none",
        isRegeneration: true,
        regeneration: previousItemIds.length ? {
          requestKind: "regenerate",
          previousRecommendationId: entry.outfitRecommendationId || entry.outfit?.id || null,
          previousItemIds,
          lockedItemIds: itemRules.lockedItemIds,
          excludedItemIds: itemRules.excludedItemIds,
          minimumCoreChanges: 2,
          maximumOverlap: 0.4
        } : undefined
      });
    } finally {
      setIsRegeneratingLooks(false);
    }
  }

  async function handleRegenerateMatch(entry: ChatMessage, refinement?: string) {
    if (loading || referenceBusy || isRegeneratingLooks) return;
    const reference = entry.referenceItem || entry.outfit?.referenceItems?.[0] || activeReference;
    if (!reference?.id) return;

    const previousRecommendation = entry.referenceRecommendations?.[0] || entry.outfit || null;
    const previousItems = previousRecommendation?.items || [];
    const currentItems = previousItems
      .map((item) => item.name)
      .filter(Boolean)
      .join(", ");
    const prompt = [
      entry.content || "Style this photo with my closet.",
      refinement ? `Refinement: ${refinement}.` : "",
      currentItems ? `Create a fresh alternative and avoid repeating this exact combination: ${currentItems}.` : "Create a fresh alternative."
    ].filter(Boolean).join("\n");

    setIsRegeneratingLooks(true);
    setError("");
    try {
      const previousItemIds = previousItems.map(wardrobeItemId).filter(Boolean);
      const itemRules = regenerationItemRules(previousItems, refinement);
      const result = await getReferenceFashionRecommendations(reference.id, {
        message: prompt,
        regeneration: previousItemIds.length ? {
          requestKind: "regenerate",
          previousRecommendationId: previousRecommendation?.id || entry.outfitRecommendationId || null,
          previousItemIds,
          lockedItemIds: itemRules.lockedItemIds,
          excludedItemIds: itemRules.excludedItemIds,
          minimumCoreChanges: 2,
          maximumOverlap: 0.35
        } : undefined
      });
      if (!result.ok) {
        setError(safeUserMessage(result.error, "We couldn’t refresh this match right now. Please try again."));
        return;
      }

      patchMessage(entry.id, {
        referenceItem: result.data.referenceItem || reference,
        referenceRecommendations: result.data.recommendations || entry.referenceRecommendations || []
      });
      showToast("New match ready.");
      revealContent(lookStudioRef, { delayMs: 120, topOffset: 24, bottomOffset: 136 });
    } finally {
      setIsRegeneratingLooks(false);
    }
  }

  function renderLookStudio(entry: ChatMessage) {
    const outfit = entry.outfit;
    const reference = entry.referenceItem || outfit?.referenceItems?.[0] || null;
    const referenceRecommendations = entry.referenceRecommendations || [];
    const preview = entry.avatarPreview;
    const recommendations = referenceRecommendations.length ? referenceRecommendations.slice(0, 3) : outfit ? [outfit] : [];
    const recommendationMode = reference ? "match" : "create";

    return (
      <>
        {reference ? (
          <ReferenceImageCard
            reference={reference}
            busy={referenceBusy}
          />
        ) : null}
        {reference ? <DetectedPiecesPanel reference={reference} /> : null}
        <EditorialRecommendationStack
          recommendations={recommendations}
          mode={recommendationMode}
          loading={loading || isRegeneratingLooks}
          preview={preview}
          assistantNote={entry.content}
          reference={reference}
          onRegenerate={reference ? (refinement) => void handleRegenerateMatch(entry, refinement) : (refinement) => void handleRegenerateLooks(entry, refinement)}
        />
      </>
    );
  }

  return (
    <section className="pb-4 pt-3 lg:pt-5">
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_UPLOAD_POLICY.acceptAttribute}
        capture={filePickerSource === "camera" ? "environment" : undefined}
        className="sr-only"
        aria-label="Choose a fashion photo"
        onChange={(event) => void handleReferenceFiles(event.currentTarget.files)}
      />

      {pickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/30 px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:justify-center">
          <div role="dialog" aria-modal="true" aria-label="Choose photo source" className="w-full max-w-sm rounded-[1.75rem] border border-line bg-surface p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">Match an Outfit</p>
                <p className="mt-1 text-xs leading-5 text-muted">Upload a product photo, screenshot, or outfit reference.</p>
              </div>
              <button
                type="button"
                className="focus-ring inline-flex size-9 items-center justify-center rounded-full border border-line bg-canvas text-muted"
                onClick={() => setPickerOpen(false)}
                aria-label="Close photo picker"
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 grid gap-2">
              <Button type="button" onClick={() => openReferencePicker("camera")}>
                <Camera size={16} aria-hidden="true" />
                Take photo
              </Button>
              <Button type="button" variant="secondary" onClick={() => openReferencePicker("upload")}>
                <UploadCloud size={16} aria-hidden="true" />
                Upload inspiration
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {productMode === "hub" ? (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <StylistProductCard
            title="Create a Look"
            body="Start with an occasion, mood, weather, or favourite piece."
            action="Create a Look"
            note="Closet first"
            icon={WandSparkles}
            active={currentFlow === "create"}
            onClick={() => chooseFlow("create")}
          />
          <StylistProductCard
            title="Match an Outfit"
            body="Upload inspiration and build a look from your closet."
            action="Match an Outfit"
            note="Photo or screenshot"
            icon={ImagePlus}
            featured
            active={currentFlow === "match"}
            onClick={() => chooseFlow("match")}
          />
        </div>
      ) : null}

      <div ref={workspaceRef} className="scroll-mt-6 lg:grid lg:min-h-[calc(100svh-2.5rem)] lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        <aside className="hidden border-r border-line/80 px-2 py-5 pr-7 lg:flex lg:flex-col">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted">In this chat</h2>
            <button type="button" className="focus-ring inline-flex size-10 items-center justify-center rounded-xl text-muted transition hover:bg-white hover:text-ink" aria-label="Start a new conversation" onClick={startNewConversation} disabled={loading || referenceBusy || isRegeneratingLooks}>
              <Plus size={17} aria-hidden="true" />
            </button>
          </div>
          <div className="mt-6 flex flex-1 flex-col">
            {requestHistory.length ? (
              <ol className="space-y-1 border-l border-line pl-4">
                {requestHistory.map((request) => (
                  <li key={request.id} className="relative py-2 before:absolute before:-left-[1.22rem] before:top-4 before:size-2 before:rounded-full before:bg-cocoa">
                    <p className="line-clamp-2 text-sm font-medium leading-5 text-ink">{request.content}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="my-auto text-center">
                <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-white text-muted"><MessageSquare size={16} aria-hidden="true" /></div>
                <p className="mt-4 text-sm font-semibold text-ink">Start your first request</p>
                <p className="mt-1 text-sm leading-5 text-muted">Your prompts in this chat will appear here.</p>
              </div>
            )}
          </div>
        </aside>

        <div className="relative flex min-h-[calc(100svh-9rem)] min-w-0 flex-col lg:min-h-[calc(100svh-2.5rem)]">
          <header className="mb-8 flex items-start justify-between gap-5 px-1 sm:mb-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-cocoa">MyFitPick AI stylist</p>
              <h1 className="font-editorial mt-2 text-4xl font-medium leading-[1.02] tracking-[-0.025em] text-ink sm:text-5xl">Describe it. I&apos;ll style it.</h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-muted">Share an occasion, mood, or weather. MyFitPick will build looks using your saved wardrobe.</p>
            </div>
            {messages.length ? (
              <button type="button" className="focus-ring hidden min-h-11 shrink-0 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink sm:inline-flex sm:items-center" onClick={startNewConversation} disabled={loading || referenceBusy || isRegeneratingLooks}>
                New chat
              </button>
            ) : null}
          </header>

          <form className="relative z-10 mb-8 px-1" onSubmit={(event) => { event.preventDefault(); void submitStylistMessage(); }}>
            <div className="mx-auto max-w-3xl rounded-2xl border border-line bg-surfaceWarm p-3 shadow-soft transition focus-within:border-cocoa/45 focus-within:ring-4 focus-within:ring-cocoa/5">
              <label className="sr-only" htmlFor="stylist-agent-prompt">Ask MyFitPick</label>
              <textarea id="stylist-agent-prompt" maxLength={800} value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && voiceState === "idle") { event.preventDefault(); void submitStylistMessage(); } }} placeholder="Ask MyFitPick to style a look..." rows={2} className="min-h-[54px] w-full resize-none border-0 bg-transparent px-2 py-2 text-[15px] leading-6 text-ink outline-none placeholder:text-muted/80" />
              {voiceState === "recording" ? (
                <div className="mb-2 flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-danger/20 bg-danger/5 px-3 py-2" aria-live="polite">
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <span className="size-2.5 animate-pulse rounded-full bg-danger" aria-hidden="true" />
                    Recording {formattedVoiceTime(voiceSeconds)} / 1:00
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <button type="button" onClick={cancelVoiceRecording} className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-muted transition hover:bg-white hover:text-ink" aria-label="Cancel voice note">
                      <X size={15} aria-hidden="true" /> Cancel
                    </button>
                    <button type="button" onClick={stopVoiceRecording} className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-ink px-3 text-sm font-semibold text-white transition hover:bg-cocoa" aria-label="Stop and transcribe voice note">
                      <Square size={13} fill="currentColor" aria-hidden="true" /> Stop
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setPickerOpen(true)} disabled={loading || referenceBusy || voiceState !== "idle"} className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-muted transition hover:border-cocoa/35 hover:text-ink disabled:opacity-50">
                    <Plus size={15} aria-hidden="true" /> <span>Add image</span>
                  </button>
                  {voiceSupported || voiceState !== "idle" ? (
                    <button type="button" onClick={() => void startVoiceRecording()} disabled={loading || referenceBusy || voiceState !== "idle"} className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-muted transition hover:border-cocoa/35 hover:text-ink disabled:opacity-50" aria-label={voiceState === "transcribing" ? "Transcribing voice note" : "Record a voice note"}>
                      {voiceState === "transcribing" ? <RefreshCw size={15} className="animate-spin" aria-hidden="true" /> : <Mic size={15} aria-hidden="true" />}
                      <span>{voiceState === "transcribing" ? "Transcribing" : "Voice"}</span>
                    </button>
                  ) : null}
                </div>
                <button type="submit" disabled={loading || referenceBusy || voiceState !== "idle" || (!message.trim() && activeReference?.status !== "ready")} className="focus-ring inline-flex size-11 items-center justify-center rounded-xl bg-cocoa text-white transition hover:bg-[#456A66] disabled:cursor-not-allowed disabled:opacity-35" aria-label={loading ? "Styling your look" : "Send message"}>
                  {loading ? <RefreshCw size={16} className="animate-spin" aria-hidden="true" /> : <ArrowUp size={17} aria-hidden="true" />}
                </button>
              </div>
            </div>
            {voiceError ? <p className="mx-auto mt-2 max-w-3xl text-sm font-medium text-danger" role="alert">{voiceError}</p> : null}
            <p className="mt-2 text-center text-xs text-muted" aria-live="polite">{voiceState === "transcribing" ? "Turning your voice note into editable text…" : "MyFitPick styles with the wardrobe details you've saved."}</p>
          </form>

          <div className="flex-1 px-1 pb-8">
            {initialWardrobeItem ? (
              <Card className="mb-6 flex max-w-3xl items-center gap-4 border-cocoa/25 bg-cocoa/10 p-3">
                <ImageFrame
                  src={initialWardrobeItem.thumbnailUrl || initialWardrobeItem.imageUrl}
                  alt={initialWardrobeItem.name}
                  placeholder={initialWardrobeItem.category}
                  className="size-20 shrink-0 rounded-xl"
                  fit="contain"
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cocoa">Styling around</p>
                  <p className="mt-1 truncate text-base font-semibold text-ink">{initialWardrobeItem.name}</p>
                  <p className="mt-1 text-sm text-muted">This closet item will stay in the recommended look.</p>
                </div>
              </Card>
            ) : null}
            {messages.length === 0 && !activeReference && !referencePreviewUrl ? (
              <div className="flex min-h-[34svh] max-w-2xl flex-col justify-center border-y border-line/70 py-12">
                <span className="mb-5 inline-flex size-12 items-center justify-center rounded-xl bg-white text-cocoa"><Sparkles size={20} aria-hidden="true" /></span>
                <h2 className="text-2xl font-semibold tracking-tight text-ink">What are you dressing for?</h2>
                <p className="mt-2 max-w-lg text-base leading-7 text-muted">Tell me where you&apos;re going, how you want to feel, and any piece you&apos;d like to wear—or add an inspiration image.</p>
              </div>
            ) : (
              <div className="max-w-4xl space-y-10">
                {messages.map((entry) => (
                  <article key={entry.id} className="grid gap-4 border-b border-line/70 pb-10 sm:grid-cols-[7rem_minmax(0,1fr)]">
                    <p className={cn("text-xs font-bold uppercase tracking-[0.14em]", entry.role === "user" ? "text-muted" : "text-cocoa")}>{entry.role === "user" ? "You" : "MyFitPick"}</p>
                    <div className="min-w-0">
                      <p className={cn("whitespace-pre-wrap text-base leading-7", entry.role === "user" ? "font-medium text-ink" : "text-ink")}>{entry.content}</p>
                      {entry.role === "assistant" && (entry.outfit || entry.outfitRecommendationId || entry.referenceRecommendations?.length) ? (
                        <div ref={entry.id === latestLook?.id ? lookStudioRef : undefined} className="mt-7">{renderLookStudio(entry)}</div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {activeReference ? (
              <div className="mt-8 max-w-3xl space-y-3" aria-live="polite">
                <ReferenceImageCard reference={activeReference} onClear={() => void clearActiveReference()} busy={referenceBusy} />
                {activeReference.status === "needs-selection" ? <ReferenceSelectionCard reference={activeReference} onSelect={(detectedItemId) => void chooseDetectedReference(detectedItemId)} busy={referenceBusy} /> : null}
              </div>
            ) : referencePreviewUrl ? (
              <div className="mt-8 flex max-w-3xl items-center gap-3 rounded-xl border border-line bg-white p-3" aria-live="polite">
                <ImageFrame src={referencePreviewUrl} alt="Selected fashion photo preview" placeholder="Photo" className="h-16 w-16 shrink-0 rounded-xl" />
                <div><p className="text-sm font-semibold text-ink">Photo selected</p><p className="mt-1 text-xs text-muted">{referenceMessage || "Reading your inspiration..."}</p></div>
              </div>
            ) : null}
          </div>

        </div>
      </div>

      {error ? <p className="mt-4 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-semibold text-ink" role="alert">{error}</p> : null}
      {toast ? <p className="mt-4 rounded-xl border border-success/25 bg-success/10 px-4 py-3 text-sm font-semibold text-success" role="status">{toast}</p> : null}
    </section>
  );
}
