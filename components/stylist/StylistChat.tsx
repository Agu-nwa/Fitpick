"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Camera, ImagePlus, Layers3, RefreshCw, Sparkles, UploadCloud, WandSparkles, X, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { PreviewDownloadButton } from "@/components/outfit/PreviewDownloadButton";
import { useRevealContent } from "@/hooks/use-reveal-content";
import {
  analyzeReferenceFashionItem,
  clearReferenceFashionItem,
  createReferenceFashionItem,
  getReferenceFashionRecommendations,
  getJobStatus,
  requestSignedUploadUrl,
  selectReferenceFashionItem,
  sendStylistMessage,
  uploadImageViaServer
} from "@/lib/api-client";
import { imageUploadErrorMessage, normalizeImageForUpload, type NormalizedImageUpload } from "@/lib/image-upload/browser-normalize";
import { IMAGE_UPLOAD_POLICY, type ImageUploadSource } from "@/lib/image-upload-policy";
import { safeTryOnErrorMessage, safeUploadErrorMessage, safeUserMessage, safeUserMessages } from "@/lib/user-facing-errors";
import { cn } from "@/lib/utils";
import type { OutfitRecommendation, ReferenceFashionItemSummary, StylistAvatarPreview, StylistResponse, StylistVisualMode } from "@/types/outfit";

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

const occasionSuggestions = [
  { label: "Work", prompt: "Style me for work today" },
  { label: "Date night", prompt: "Create a clean date night look" },
  { label: "Wedding", prompt: "Create a wedding guest look" },
  { label: "Casual", prompt: "Create an easy casual look" },
  { label: "Travel", prompt: "Create a travel outfit" },
  { label: "Dinner", prompt: "Create a clean dinner look" },
  { label: "Weekend", prompt: "Create a weekend look" },
  { label: "Weather", prompt: "What should I wear in this weather?" }
];

const promptSuggestions = [
  "Style me for work today",
  "Create a clean dinner look",
  "Match this outfit with my closet",
  "What should I wear in this weather?"
];

const createLookExamples = [
  "Style me for dinner.",
  "Create something relaxed but polished.",
  "I need an outfit for a wedding.",
  "Help me dress for a first date.",
  "Build a smart casual look."
];

const createLoadingSteps = [
  "MyFitPick is styling your look.",
  "Balancing colour and silhouette",
  "Selecting the strongest outfit",
  "Preparing your preview"
];

const matchLoadingSteps = [
  "MyFitPick is finding closet matches.",
  "Reading your inspiration",
  "Styling around your closet",
  "Preparing your preview"
];

const refinementChips = [
  "More relaxed",
  "More elevated",
  "Add colour",
  "Keep trousers",
  "Keep jacket",
  "Avoid trainers"
];

function messageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
        "focus-ring group min-h-56 w-full min-w-0 overflow-hidden rounded-xl3 border p-5 text-left shadow-card transition hover:-translate-y-0.5",
        featured
          ? "border-cocoa/30 bg-gradient-to-br from-cocoa/12 via-surface to-olive/10"
          : "border-line bg-surface/90",
        active ? "ring-2 ring-cocoa/30" : "hover:border-cocoa/35"
      )}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className={cn("inline-flex size-11 items-center justify-center rounded-2xl border", featured ? "border-cocoa/25 bg-cocoa text-canvas" : "border-line bg-canvas text-cocoa")}>
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

function outfitVisualImages(outfit: OutfitRecommendation) {
  return outfit.items
    .map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      imageUrl: item.thumbnailUrl || item.imageUrl
    }))
    .filter((item) => Boolean(item.imageUrl))
    .slice(0, 6);
}

function EditorialOutfitVisual({
  outfit,
  featured,
  preview
}: {
  outfit: OutfitRecommendation;
  featured?: boolean;
  preview?: StylistAvatarPreview;
}) {
  if (featured && preview?.imageUrl) {
    return (
      <ImageFrame
        src={preview.imageUrl}
        alt={`${outfit.title} virtual try-on preview`}
        placeholder={outfit.title}
        className="min-h-[32rem] rounded-[1.5rem] border-0 bg-canvas sm:min-h-[42rem]"
      />
    );
  }

  const images = outfitVisualImages(outfit);
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
        <ImageFrame
          key={`${item.id}-${index}`}
          src={item.imageUrl}
          alt={item.name}
          placeholder={item.category}
          className={cn(
            "h-full min-h-28 rounded-2xl border-0 bg-surface",
            index === 0 ? "col-span-2 row-span-2 min-h-72 sm:col-span-2" : ""
          )}
        />
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
                {outfit.items.slice(0, 8).map((item) => (
                  <div key={item.id} className="overflow-hidden rounded-2xl border border-line bg-canvas/70">
                    <ImageFrame
                      src={item.thumbnailUrl || item.imageUrl}
                      alt={item.name}
                      placeholder={item.category}
                      className="h-28 rounded-none border-0"
                    />
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
  onRegenerate?: (refinement?: string) => void;
  showRegenerate?: boolean;
  showRefinementChips?: boolean;
}) {
  const featured = index === 0;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const previewFailed = featured && preview?.status === "failed";
  const previewReady = featured && Boolean(preview?.imageUrl);

  return (
    <article
      className={cn(
        "w-full overflow-hidden rounded-[2rem] border bg-surface/90 p-3 shadow-card transition sm:p-5",
        featured ? "border-cocoa/25" : "border-line"
      )}
    >
      <div className="relative">
        {featured ? (
          <p className="absolute left-4 top-4 z-10 rounded-full border border-white/70 bg-surface/85 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-cocoa shadow-soft backdrop-blur">
            {reference ? "Best Match" : "Editor's Pick"}
          </p>
        ) : null}
        <EditorialOutfitVisual outfit={outfit} featured={featured} preview={featured ? preview : undefined} />
      </div>
      <div className="grid gap-5 px-1 py-5 sm:px-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          {reference ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-cocoa">Styled Around Your Item</p> : null}
          <h4 className={cn("font-editorial font-semibold leading-none text-ink", featured ? "text-5xl sm:text-6xl" : "text-4xl sm:text-5xl")}>
            {outfit.title}
          </h4>
          {outfit.summary ? <p className="mt-3 max-w-xl truncate text-sm leading-6 text-muted">{outfit.summary}</p> : null}
        </div>
        <div className="grid gap-2 lg:min-w-80">
          <Link href={`/outfit/${outfit.id}/preview`} className="block">
            <Button type="button" className="w-full">
              Virtual Try-On
            </Button>
          </Link>
          {showRegenerate && onRegenerate ? (
            <Button type="button" variant="secondary" onClick={() => onRegenerate()} disabled={loading}>
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden="true" />
              {loading ? "Regenerating..." : "Regenerate Look"}
            </Button>
          ) : null}
          {previewReady ? <PreviewDownloadButton outfitId={outfit.id} /> : null}
          <Button type="button" variant="ghost" onClick={() => setDetailsOpen(true)}>
            View Details
          </Button>
        </div>
      </div>

      {previewFailed ? (
        <div className="mx-1 mb-4 rounded-2xl border border-warning/20 bg-warning/10 p-4 sm:mx-2">
          <p className="font-semibold text-ink">Your outfit is ready.</p>
          <p className="mt-1 text-sm leading-6 text-muted">The preview couldn&apos;t be generated. You can try again without rebuilding the outfit.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link href={`/outfit/${outfit.id}/preview`} className="block">
              <Button type="button" className="w-full">Generate Preview Again</Button>
            </Link>
            <Button type="button" variant="secondary" onClick={() => setDetailsOpen(true)}>View Outfit</Button>
          </div>
        </div>
      ) : null}
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
  productMode = "hub"
}: {
  initialFlow?: StylistFlow;
  productMode?: StylistProductMode;
} = {}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const lookStudioRef = useRef<HTMLDivElement>(null);
  const lastReferenceFileRef = useRef<{ file: File; source: "camera" | "upload" } | null>(null);
  const conversationIdRef = useRef(`stylist-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const revealContent = useRevealContent();
  const [activeFlow, setActiveFlow] = useState<StylistFlow>(initialFlow);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRegeneratingLooks, setIsRegeneratingLooks] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [includeVisualization, setIncludeVisualization] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filePickerSource, setFilePickerSource] = useState<"camera" | "upload">("upload");
  const [referenceBusy, setReferenceBusy] = useState(false);
  const [referenceMessage, setReferenceMessage] = useState("");
  const [referencePreviewUrl, setReferencePreviewUrl] = useState("");
  const [activeReference, setActiveReference] = useState<ReferenceFashionItemSummary | null>(null);
  const [canRetryReferenceUpload, setCanRetryReferenceUpload] = useState(false);
  const [lastCreateBrief, setLastCreateBrief] = useState("");
  const [exampleIndex, setExampleIndex] = useState(0);
  const currentFlow = productMode === "create" || productMode === "match" ? productMode : activeFlow;
  const flowLoadingSteps = currentFlow === "match" ? matchLoadingSteps : createLoadingSteps;
  const recentMessages = useMemo(() => messages.slice(-8), [messages]);
  const latestAssistant = useMemo(
    () => [...messages].reverse().find((entry) => entry.role === "assistant"),
    [messages]
  );
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
    if (currentFlow !== "create") return;
    const timer = window.setInterval(() => {
      setExampleIndex((current) => (current + 1) % createLookExamples.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [currentFlow]);

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
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await wait(2500);
      const result = await getJobStatus(jobId);
      if (!result.ok) continue;

      const job = result.data.job;
      if (job.status === "completed") {
        const preview = job.result?.preview || {};
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

  async function submitStylistMessage(text?: string, options: { includeVisualization?: boolean; visualMode?: StylistVisualMode; isRegeneration?: boolean } = {}) {
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
      content: "Your stylist is putting the look together."
    };
    const sessionMessages = [...messages, userEntry, assistantEntry];

    setLoading(true);
    setError("");
    setMessage("");
    if (flowForRequest === "create" && !options.isRegeneration) setLastCreateBrief(promptText);
    setMessages(sessionMessages);
    revealContent(lookStudioRef, { delayMs: 120, topOffset: 24, bottomOffset: 136 });

    const response = await sendStylistMessage(promptText, {
      includeVisualization: options.includeVisualization ?? includeVisualization,
      visualMode: options.visualMode || "digital_human",
      referenceItemId: referenceForMessage?.id || null,
      recentMessages: recentMessages.map((entry) => ({ role: entry.role, content: entry.content }))
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

    if (jobId && avatarPreview.status !== "ready" && !response.data.redirectTo) {
      void pollAvatarJob(assistantId, jobId);
    }

    if (response.data.outfitRecommendationId && !referenceForMessage) {
      showToast("MyFitPick is preparing your look.");
      if (response.data.redirectTo) router.push(response.data.redirectTo);
    }
  }

  async function handleRegenerateLooks(entry: ChatMessage, refinement?: string) {
    if (loading || referenceBusy || isRegeneratingLooks) return;
    const originalBrief = lastCreateBrief || requestHistory.find((request) => !request.attachment)?.content || "Create a polished look from my wardrobe.";
    const currentItems = entry.outfit?.items.map((item) => item.name).filter(Boolean).join(", ");
    const refinementLine = refinement ? `\nRefinement: ${refinement}.` : "";
    const regenerationPrompt = currentItems
      ? `${originalBrief}${refinementLine}\nCreate a fresh alternative from my wardrobe and avoid repeating this exact combination: ${currentItems}.`
      : `${originalBrief}${refinementLine}\nCreate a fresh alternative from my wardrobe.`;

    setIsRegeneratingLooks(true);
    try {
      await submitStylistMessage(regenerationPrompt, {
        includeVisualization,
        visualMode: "digital_human",
        isRegeneration: true
      });
    } finally {
      setIsRegeneratingLooks(false);
    }
  }

  async function handleRegenerateMatch(entry: ChatMessage, refinement?: string) {
    if (loading || referenceBusy || isRegeneratingLooks) return;
    const reference = entry.referenceItem || entry.outfit?.referenceItems?.[0] || activeReference;
    if (!reference?.id) return;

    const currentItems = (entry.referenceRecommendations?.[0]?.items || entry.outfit?.items || [])
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
      const result = await getReferenceFashionRecommendations(reference.id, { message: prompt });
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
    <section className="space-y-5 pb-4 pt-6">
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
        <div className="grid gap-4 md:grid-cols-2">
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

      <div ref={workspaceRef} className="scroll-mt-6 space-y-5">
        {currentFlow === "create" ? (
          <Card className="space-y-4 border-olive/20 bg-surface/88 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">
                  <WandSparkles size={14} aria-hidden="true" />
                  Create a Look
                </p>
                <h2 className="font-editorial mt-2 text-3xl font-semibold leading-none text-ink">Create from your closet.</h2>
              </div>
              <Badge tone="premium">Closet-led</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {occasionSuggestions.map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  className={cn(
                    "focus-ring min-h-12 rounded-2xl border px-3 py-2 text-sm font-semibold transition hover:border-cocoa/40",
                    message === suggestion.prompt ? "border-cocoa/40 bg-cocoa/10 text-cocoa" : "border-line bg-canvas/70 text-ink"
                  )}
                  onClick={() => setMessage(suggestion.prompt)}
                  aria-pressed={message === suggestion.prompt}
                  disabled={loading}
                >
                  {suggestion.label}
                </button>
              ))}
            </div>

            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submitStylistMessage();
              }}
            >
              <div className="flex flex-wrap gap-2">
                {promptSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="focus-ring rounded-full border border-line bg-white/70 px-3 py-2 text-xs font-semibold text-muted transition hover:border-cocoa/30 hover:text-ink"
                    onClick={() => setMessage(suggestion)}
                    disabled={loading}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="focus-ring rounded-full border border-line bg-white/70 px-3 py-2 text-xs font-semibold text-cocoa transition hover:border-cocoa/40"
                onClick={() => setMessage(createLookExamples[exampleIndex])}
                disabled={loading}
              >
                {createLookExamples[exampleIndex]}
              </button>
              <label className="sr-only" htmlFor="stylist-create-prompt">Tell your stylist what you need</label>
              <textarea
                id="stylist-create-prompt"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Dinner, work, date night, errands, church, travel..."
                className="focus-ring min-h-24 w-full resize-none rounded-2xl border border-line bg-canvas/80 px-4 py-4 text-sm leading-6 text-ink outline-none placeholder:text-muted"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
                  <input
                    type="checkbox"
                    checked={includeVisualization}
                    onChange={(event) => setIncludeVisualization(event.target.checked)}
                    className="h-4 w-4 rounded border-line accent-cocoa"
                  />
                  Virtual Try-On
                </label>
                <Button type="submit" disabled={loading || referenceBusy || !message.trim()}>
                  <Sparkles size={16} aria-hidden="true" />
                  {loading ? "Your stylist is putting the look together." : "Create a Look"}
                </Button>
              </div>
            </form>
          </Card>
        ) : null}

        {currentFlow === "match" ? (
          <Card className="min-w-0 space-y-4 overflow-hidden border-cocoa/25 bg-surface/88 p-4 sm:p-6">
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="min-w-0 space-y-4">
                <div>
                  <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">
                    <ImagePlus size={14} aria-hidden="true" />
                    Match an Outfit
                  </p>
                  <h2 className="font-editorial mt-2 text-3xl font-semibold leading-none text-ink">Style around inspiration.</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">Upload a product photo, screenshot, or outfit reference and build a look from your closet.</p>
                </div>
                <MatchFlowVisual />
                <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                  <Button type="button" onClick={() => setPickerOpen(true)} disabled={loading || referenceBusy}>
                    <UploadCloud size={16} aria-hidden="true" />
                    Upload inspiration
                  </Button>
                  {activeReference || referencePreviewUrl ? (
                    <Button type="button" variant="secondary" onClick={() => void clearActiveReference()} disabled={referenceBusy}>
                      Start another match
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="min-w-0 space-y-3">
                {activeReference ? (
                  <div className="min-w-0 space-y-3" aria-live="polite">
                    <ReferenceImageCard
                      reference={activeReference}
                      onClear={() => void clearActiveReference()}
                      busy={referenceBusy}
                    />
                    {activeReference.status === "needs-selection" ? (
                      <ReferenceSelectionCard
                        reference={activeReference}
                        onSelect={(detectedItemId) => void chooseDetectedReference(detectedItemId)}
                        busy={referenceBusy}
                      />
                    ) : null}
                    <DetectedPiecesPanel reference={activeReference} busy={referenceBusy} />
                  </div>
                ) : referencePreviewUrl ? (
                  <div className="min-w-0 rounded-2xl border border-line bg-canvas/70 p-3" aria-live="polite">
                    <div className="flex min-w-0 items-center gap-3">
                      <ImageFrame
                        src={referencePreviewUrl}
                        alt="Selected fashion photo preview"
                        placeholder="Photo"
                        className="h-20 w-20 shrink-0 rounded-xl"
                      />
                      <div>
                        <p className="text-sm font-semibold text-ink">Photo selected</p>
                        <p className="mt-1 text-xs leading-5 text-muted">{referenceMessage || "Reading your inspiration..."}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-line bg-canvas/70 px-5 text-center">
                    <div>
                      <ImagePlus size={26} className="mx-auto mb-3 text-cocoa" aria-hidden="true" />
                    <p className="font-editorial text-3xl font-semibold leading-none text-ink">Add a look you love.</p>
                    <p className="mt-2 text-sm leading-6 text-muted">A photo or screenshot is enough.</p>
                  </div>
                </div>
              )}

                {referenceMessage ? (
                  <div className="rounded-2xl border border-line bg-canvas/60 px-3 py-2" aria-live="polite">
                    <p className="text-xs font-semibold text-muted">{referenceMessage}</p>
                    {canRetryReferenceUpload && !activeReference ? (
                      <Button type="button" variant="secondary" className="mt-2 w-full" onClick={() => void retryReferenceUpload()} disabled={referenceBusy}>
                        Retry upload
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                <form
                  className="min-w-0 space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitStylistMessage();
                  }}
                >
                  <p className="text-sm font-semibold text-ink">Ask your stylist</p>
                  <label className="sr-only" htmlFor="stylist-match-prompt">Add optional direction for this match</label>
                  <textarea
                    id="stylist-match-prompt"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Ask your stylist..."
                    className="focus-ring min-h-20 w-full resize-none rounded-2xl border border-line bg-canvas/80 px-4 py-3 text-sm leading-6 text-ink outline-none placeholder:text-muted"
                  />
                  <div className="grid min-w-0 gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
                    <label className="inline-flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted sm:tracking-[0.14em]">
                      <input
                        type="checkbox"
                        checked={includeVisualization}
                        onChange={(event) => setIncludeVisualization(event.target.checked)}
                        className="h-4 w-4 rounded border-line accent-cocoa"
                      />
                      Virtual Try-On
                    </label>
                    <Button type="submit" className="w-full sm:w-auto" disabled={loading || referenceBusy || activeReference?.status !== "ready"}>
                      <Sparkles size={16} aria-hidden="true" />
                      {loading ? "MyFitPick is finding closet matches." : "Match an Outfit"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </Card>
        ) : null}
      </div>

      {error ? <p className="rounded-2xl border border-danger/25 bg-danger/10 px-3 py-2 text-xs font-semibold text-ink">{error}</p> : null}
      {toast ? <p className="rounded-2xl border border-success/25 bg-success/10 px-3 py-2 text-xs font-semibold text-success">{toast}</p> : null}

      {latestLook || loading || latestAssistant ? (
        <div ref={lookStudioRef} className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">
                <Layers3 size={14} aria-hidden="true" />
                {currentFlow === "match" ? "Your look is ready" : "Your look is ready"}
              </p>
              <h2 className="font-editorial mt-2 text-4xl font-semibold leading-none text-ink sm:text-5xl">
                {currentFlow === "match" ? "Here is how you can wear this with your closet." : "Built from pieces already in your closet."}
              </h2>
            </div>
          </div>

          {latestLook ? (
            renderLookStudio(latestLook)
          ) : loading ? (
            <Card className="flex min-h-80 items-center justify-center border-dashed border-line bg-canvas/60 px-5 text-center">
              <div className="space-y-2">
                {flowLoadingSteps.map((step) => (
                  <p key={step} className="text-sm font-semibold text-muted">{step}</p>
                ))}
              </div>
            </Card>
          ) : latestAssistant ? (
            <Card className="rounded-2xl border border-line bg-canvas/60 p-4">
              <details>
                <summary className="focus-ring inline-flex cursor-pointer rounded-full text-xs font-bold uppercase tracking-[0.16em] text-cocoa">
                  View stylist note
                </summary>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cocoa">Stylist note</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">{latestAssistant.content}</p>
              </details>
            </Card>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
