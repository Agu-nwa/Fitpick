"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, Camera, CloudRain, HeartHandshake, ImagePlus, MessageCircle, Sparkles, UploadCloud, WandSparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { PreviewDownloadButton } from "@/components/outfit/PreviewDownloadButton";
import {
  addReferenceFashionItemToCloset,
  analyzeReferenceFashionItem,
  clearReferenceFashionItem,
  createReferenceFashionItem,
  generateAvatarPreview,
  getJobStatus,
  requestSignedUploadUrl,
  saveOutfit,
  selectReferenceFashionItem,
  sendStylistMessage,
  uploadImageViaServer
} from "@/lib/api-client";
import { imageUploadErrorMessage, normalizeImageForUpload, type NormalizedImageUpload } from "@/lib/image-upload/browser-normalize";
import { IMAGE_UPLOAD_POLICY, type ImageUploadSource } from "@/lib/image-upload-policy";
import { completenessLabel } from "@/lib/recommendation/completeness";
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

const promptSuggestions = [
  { label: "Work", prompt: "Style me for work in cold weather", icon: CalendarDays },
  { label: "Dinner", prompt: "Find a polished dinner look", icon: Sparkles },
  { label: "Wedding", prompt: "What should I wear to a wedding?", icon: HeartHandshake },
  { label: "Rain", prompt: "Dress me for a rainy day", icon: CloudRain }
];

const loadingSteps = [
  "Reading your wardrobe...",
  "Finding a few options...",
  "Preparing your preview..."
];

function messageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function previewTone(status?: string) {
  if (status === "ready") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "queued" || status === "generating" || status === "processing") return "premium" as const;
  return "neutral" as const;
}

function previewLabel(status?: string) {
  if (status === "ready") return "Avatar ready";
  if (status === "failed") return "Preview failed";
  if (status === "queued") return "Preview waiting";
  if (status === "generating" || status === "processing") return "Showing outfit";
  return "See it on you";
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
    visualGroundingStatus: preview?.visualGroundingStatus
  };
}

function referenceLabel(reference?: ReferenceFashionItemSummary | null) {
  if (!reference) return "Uploaded item";
  return [reference.primaryColor, reference.subcategory || reference.category].filter(Boolean).join(" ").trim() || "Uploaded item";
}

function referenceStatusCopy(reference?: ReferenceFashionItemSummary | null) {
  if (!reference) return "";
  if (reference.status === "analyzing") return "Reading photo...";
  if (reference.status === "needs-selection") return "Choose which item to style.";
  if (reference.status === "ready") return "Ready to match with your closet.";
  if (reference.status === "failed") return "Try a clearer photo.";
  return "Photo added.";
}

function ReferenceImageCard({
  reference,
  onClear,
  onAddToCloset,
  busy
}: {
  reference: ReferenceFashionItemSummary;
  onClear?: () => void;
  onAddToCloset?: () => void;
  busy?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-cocoa/15 bg-canvas/70 p-3">
      <div className="flex gap-3">
        <ImageFrame
          src={reference.imageUrl}
          alt={`${referenceLabel(reference)} reference`}
          placeholder={reference.category || "Photo"}
          className="h-20 w-20 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cocoa">Photo anchor</p>
          <p className="mt-1 truncate text-sm font-semibold text-ink">{referenceLabel(reference)}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{referenceStatusCopy(reference)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {reference.category ? <Badge tone="neutral">{reference.category}</Badge> : null}
            {reference.formality ? <Badge tone="neutral">{reference.formality}</Badge> : null}
            {reference.usableForTryOn ? <Badge tone="success">Try-on ready</Badge> : null}
          </div>
        </div>
        {onClear ? (
          <button
            type="button"
            className="focus-ring inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted hover:text-ink"
            onClick={onClear}
            aria-label="Remove reference photo"
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
      {onAddToCloset && reference.status === "ready" ? (
        <Button type="button" variant="secondary" className="mt-3 w-full" onClick={onAddToCloset} disabled={busy}>
          Add item to Closet
        </Button>
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

function ItemStrip({ outfit }: { outfit: OutfitRecommendation }) {
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cocoa">Clothes from your closet</p>
      <div className="mobile-scrollbar flex gap-2 overflow-x-auto pb-1">
        {outfit.items.map((item) => (
          <div key={item.id} className="w-32 shrink-0 overflow-hidden rounded-xl border border-line bg-surface/80">
            <ImageFrame
              src={item.thumbnailUrl || item.imageUrl}
              alt={item.name}
              placeholder={item.category}
              className="rounded-none border-0"
            />
            <div className="space-y-1 p-2">
              <p className="truncate text-xs font-semibold text-ink">{item.name}</p>
              <p className="truncate text-[11px] text-muted">{[item.color, item.category].filter(Boolean).join(" • ")}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StylistChat() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const conversationIdRef = useRef(`stylist-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [includeVisualization, setIncludeVisualization] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filePickerSource, setFilePickerSource] = useState<"camera" | "upload">("upload");
  const [referenceBusy, setReferenceBusy] = useState(false);
  const [referenceMessage, setReferenceMessage] = useState("");
  const [referencePreviewUrl, setReferencePreviewUrl] = useState("");
  const [activeReference, setActiveReference] = useState<ReferenceFashionItemSummary | null>(null);
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

  function openReferencePicker(source: "camera" | "upload") {
    setPickerOpen(false);
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
    const makePayload = (input: { publicUrl: string; storageKey: string }) => ({
      conversationId: conversationIdRef.current,
      imageUrl: input.publicUrl,
      storageKey: input.storageKey,
      source,
      filename: file.name,
      mimeType,
      sizeBytes: file.size,
      ...(normalized.width ? { width: normalized.width } : {}),
      ...(normalized.height ? { height: normalized.height } : {})
    });

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

  async function handleReferenceFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || referenceBusy) return;

    setReferenceBusy(true);
    setReferenceMessage("Preparing photo...");
    setError("");

    try {
      const normalized = await normalizeImageForUpload(file, {
        source: filePickerSource === "camera" ? "camera" : "gallery" as ImageUploadSource,
        onStage: (stage) => {
          if (stage === "validating") setReferenceMessage("Checking photo...");
          if (stage === "converting") setReferenceMessage("Preparing iPhone photo...");
          if (stage === "uploading") setReferenceMessage("Uploading photo...");
        }
      });
      if (referencePreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(referencePreviewUrl);
      setReferencePreviewUrl(normalized.previewUrl);
      setReferenceMessage("Uploading photo...");

      const created = await uploadReferenceImage(normalized, filePickerSource);
      setActiveReference(created);
      setReferencePreviewUrl(created?.imageUrl || normalized.previewUrl);
      setReferenceMessage("Reading photo...");

      if (!created?.id) throw new Error("We couldn’t upload that image. Try another photo.");
      const analyzed = await analyzeReferenceFashionItem(created.id);
      if (analyzed.ok) {
        setActiveReference(analyzed.data.referenceItem);
        setReferencePreviewUrl(analyzed.data.referenceItem?.imageUrl || created.imageUrl);
        setReferenceMessage(analyzed.data.referenceItem?.status === "needs-selection" ? "Choose which item to style." : "Photo ready.");
      } else {
        setReferenceMessage(safeUserMessage(analyzed.error, "I couldn’t clearly identify the fashion item in this image. Try another photo."));
      }
    } catch (uploadError) {
      setReferenceMessage(imageUploadErrorMessage(uploadError) || safeUploadErrorMessage(uploadError, "We couldn’t upload that image. Try another photo."));
      setActiveReference(null);
    } finally {
      setReferenceBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function clearActiveReference() {
    const referenceId = activeReference?.id;
    setActiveReference(null);
    setReferenceMessage("");
    if (referencePreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(referencePreviewUrl);
    setReferencePreviewUrl("");
    if (referenceId) void clearReferenceFashionItem(referenceId);
  }

  async function chooseDetectedReference(detectedItemId: string) {
    if (!activeReference?.id) return;
    setReferenceBusy(true);
    setReferenceMessage("Setting photo anchor...");
    const result = await selectReferenceFashionItem(activeReference.id, detectedItemId);
    setReferenceBusy(false);
    if (!result.ok) {
      setReferenceMessage(safeUserMessage(result.error, "Unable to select that item right now."));
      return;
    }
    setActiveReference(result.data.referenceItem);
    setReferenceMessage("Photo ready.");
  }

  async function addActiveReferenceToCloset(reference = activeReference) {
    if (!reference?.id) return;
    setReferenceBusy(true);
    const result = await addReferenceFashionItemToCloset(reference.id);
    setReferenceBusy(false);
    if (!result.ok) {
      showToast(safeUserMessage(result.error, "Unable to prepare this item right now."));
      return;
    }
    router.push(result.data.nextAction);
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
        showToast("Avatar preview ready.");
        return;
      }

      if (job.status === "failed" || job.status === "cancelled") {
        patchMessage(messageIdToPatch, {
          avatarPreview: compactPreview({
            status: "failed",
            errorMessage: safeTryOnErrorMessage(job.errorMessage, "Unable to show it on your avatar right now.")
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

  async function submitStylistMessage(text?: string, options: { includeVisualization?: boolean; visualMode?: StylistVisualMode } = {}) {
    const trimmed = (text ?? message).trim();
    const referenceForMessage = activeReference?.status === "ready" ? activeReference : null;
    if ((!trimmed && !referenceForMessage) || loading || referenceBusy) return;
    if (activeReference?.status === "needs-selection") {
      setError("Choose the item you want MyFitPick to style first.");
      return;
    }
    if (activeReference?.status === "failed") {
      setError("Try a clearer photo before asking MyFitPick to style it.");
      return;
    }

    const promptText = trimmed || "Match this photo with my closet.";
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
      content: "Reading your wardrobe..."
    };
    const sessionMessages = [...messages, userEntry, assistantEntry];

    setLoading(true);
    setError("");
    setMessage("");
    setMessages(sessionMessages);

    const response = await sendStylistMessage(promptText, {
      includeVisualization: options.includeVisualization ?? includeVisualization,
      visualMode: options.visualMode || "digital_human",
      referenceItemId: referenceForMessage?.id || null,
      recentMessages: recentMessages.map((entry) => ({ role: entry.role, content: entry.content }))
    });

    setLoading(false);

    if (!response.ok) {
      const safeMessage = safeUserMessage(response.error, "Unable to reach MyFitPick Stylist right now.");
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

    if (jobId && avatarPreview.status !== "ready") {
      void pollAvatarJob(assistantId, jobId);
    }

    if (response.data.outfitRecommendationId && !referenceForMessage) {
      showToast("Opening your full look.");
      router.push(`/outfit/${response.data.outfitRecommendationId}/preview`);
    }
  }

  async function handleSaveLook(entry: ChatMessage) {
    if (!entry.outfitRecommendationId) return;
    const result = await saveOutfit(entry.outfitRecommendationId, {
      title: entry.outfit?.title || "Stylist look",
      favorite: false
    });
    showToast(result.ok ? "Look saved." : "Unable to save look right now.");
  }

  async function handleRegenerate(entry: ChatMessage) {
    if (!entry.outfitRecommendationId) return;
    patchMessage(entry.id, {
      avatarPreview: compactPreview({
        ...entry.avatarPreview,
        status: "generating",
        errorMessage: null
      })
    });

    const result = await generateAvatarPreview(entry.outfitRecommendationId, { regenerate: true });
    if (!result.ok) {
      patchMessage(entry.id, {
        avatarPreview: compactPreview({
          status: "failed",
          errorMessage: safeTryOnErrorMessage(result.error, "Unable to show it on your avatar right now.")
        })
      });
      return;
    }

    const preview = result.data.preview;
    const jobId = result.data.job?.id || null;
    patchMessage(entry.id, {
      avatarPreview: compactPreview({
        status: preview.status as StylistAvatarPreview["status"],
        jobId,
        previewId: preview.id || null,
        imageUrl: preview.imageUrl || preview.previewUrl || null,
        cacheKey: preview.cacheKey || null,
        errorMessage: preview.errorMessage ? safeTryOnErrorMessage(preview.errorMessage) : null,
        accuracyLevel: preview.accuracyLevel,
        fitStatus: preview.fitStatus,
        fitConfidence: preview.fitConfidence,
        fitWarnings: preview.fitWarnings
      }),
      jobId
    });

    if (jobId && preview.status !== "ready") {
      void pollAvatarJob(entry.id, jobId);
    }
  }

  function renderLookStudio(entry: ChatMessage) {
    const outfit = entry.outfit;
    const reference = entry.referenceItem || outfit?.referenceItems?.[0] || null;
    const preview = entry.avatarPreview;
    const status = preview?.status || "not_started";
    const hasVisualization = entry.visualMode === "digital_human" || Boolean(entry.outfitRecommendationId);
    const rawFitWarnings = entry.fitLock?.warnings?.length ? entry.fitLock.warnings : preview?.fitWarnings || [];
    const fitWarnings = safeUserMessages(rawFitWarnings);
    const completenessWarnings = safeUserMessages(outfit?.completenessWarnings || []);

    return (
      <>
        {reference ? (
          <ReferenceImageCard
            reference={reference}
            onAddToCloset={() => void addActiveReferenceToCloset(reference)}
            busy={referenceBusy}
          />
        ) : null}
        {outfit ? <ItemStrip outfit={outfit} /> : null}

        {hasVisualization ? (
          <div className="rounded-2xl border border-line bg-canvas/60 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={previewTone(status)}>{previewLabel(status)}</Badge>
              {outfit?.completenessStatus ? <Badge tone={outfit.completenessStatus === "complete" ? "success" : "warning"}>{completenessLabel(outfit.completenessStatus)}</Badge> : null}
            </div>

            {preview?.imageUrl ? (
              <ImageFrame
                src={preview.imageUrl}
                alt="MyFitPick avatar outfit preview"
                placeholder="Avatar preview"
                className="mt-3 rounded-xl"
              />
            ) : status === "queued" || status === "generating" || status === "processing" ? (
              <div className="mt-3 flex min-h-40 items-center justify-center rounded-xl border border-dashed border-line bg-surface/60 px-4 text-center">
                <p className="text-sm font-semibold text-cocoa">Showing it on your avatar...</p>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-line bg-surface/60 px-4 py-5 text-center">
                <p className="text-sm leading-6 text-muted">
                  {preview?.errorMessage ? safeTryOnErrorMessage(preview.errorMessage) : "Your avatar preview will appear here when available."}
                </p>
              </div>
            )}

            <p className="mt-3 text-xs leading-5 text-muted">Preview accuracy depends on the saved item photos and avatar details.</p>
            {fitWarnings.length ? (
              <div className="mt-3 space-y-1 rounded-xl border border-warning/20 bg-warning/10 p-3">
                {fitWarnings.slice(0, 3).map((warning) => (
                  <p key={warning} className="text-xs leading-5 text-ink">{warning}</p>
                ))}
              </div>
            ) : null}
            {completenessWarnings.length ? (
              <div className="mt-3 space-y-1 rounded-xl border border-warning/20 bg-warning/10 p-3">
                {completenessWarnings.slice(0, 2).map((warning) => (
                  <p key={warning} className="text-xs leading-5 text-ink">{warning}</p>
                ))}
              </div>
            ) : null}

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {entry.outfitRecommendationId ? (
                <Button type="button" onClick={() => void handleSaveLook(entry)}>
                  Save this look
                </Button>
              ) : null}
              {entry.outfitRecommendationId ? (
                <Link href={`/outfit/${entry.outfitRecommendationId}/preview`} className="block">
                  <Button type="button" className="w-full" variant="secondary">
                    View full look
                  </Button>
                </Link>
              ) : null}
              {entry.outfitRecommendationId && preview?.imageUrl && status === "ready" ? (
                <PreviewDownloadButton outfitId={entry.outfitRecommendationId} />
              ) : null}
              {entry.outfitRecommendationId ? (
                <Button type="button" variant="secondary" onClick={() => void submitStylistMessage(`Try another ${outfit?.occasion || "look"} from my wardrobe`, { includeVisualization: true })}>
                  Try another look
                </Button>
              ) : null}
              {entry.outfitRecommendationId ? (
                <Button type="button" variant="secondary" onClick={() => void handleRegenerate(entry)}>
                  See it on you
                </Button>
              ) : null}
              <Link href="/avatar" className="block">
                <Button type="button" variant="secondary" className="w-full">
                  Improve size details
                </Button>
              </Link>
              {outfit ? (
                <>
                  <Button type="button" variant="ghost" onClick={() => void submitStylistMessage(`Make this ${outfit.occasion || "look"} more polished`, { includeVisualization: true })}>
                    Make it more polished
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => void submitStylistMessage(`Make this ${outfit.occasion || "look"} simpler`, { includeVisualization: true })}>
                    Make it simpler
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => void submitStylistMessage(`Make this ${outfit.occasion || "look"} more formal`, { includeVisualization: true })}>
                    Make it more formal
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => void submitStylistMessage(`Make this ${outfit.occasion || "look"} more casual`, { includeVisualization: true })}>
                    Make it more casual
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <section className="space-y-5 pb-4 pt-6">
      <Card className="space-y-5 overflow-hidden border-olive/20 bg-gradient-to-br from-surface via-surface to-olive/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">
              <WandSparkles size={14} aria-hidden="true" />
              Styling appointment
            </p>
            <h2 className="font-editorial mt-2 text-4xl font-semibold leading-none text-ink">What are we dressing for?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Give the stylist an occasion, mood, setting, or dress code. MyFitPick will work from your saved closet.</p>
          </div>
          <Badge tone="premium">Closet-led</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <button
            type="button"
            className="focus-ring group min-h-24 rounded-2xl border border-cocoa/25 bg-cocoa/10 px-3 py-4 text-left transition hover:-translate-y-0.5 hover:border-cocoa/45 disabled:opacity-50"
            onClick={() => setPickerOpen(true)}
            disabled={loading || referenceBusy}
          >
            <ImagePlus size={18} className="text-cocoa" aria-hidden="true" />
            <span className="mt-4 block text-xs font-bold uppercase tracking-[0.16em] text-ink">Match photo</span>
            <span className="mt-1 block text-[11px] leading-4 text-muted">Match a photo with my closet</span>
          </button>
          {promptSuggestions.map((suggestion) => {
            const Icon = suggestion.icon;
            return (
              <button
                key={suggestion.label}
                type="button"
                className="focus-ring group min-h-24 rounded-2xl border border-line bg-canvas/60 px-3 py-4 text-left transition hover:-translate-y-0.5 hover:border-cocoa/40 disabled:opacity-50"
                onClick={() => setMessage(suggestion.prompt)}
                disabled={loading}
              >
                <Icon size={18} className="text-cocoa" aria-hidden="true" />
                <span className="mt-4 block text-xs font-bold uppercase tracking-[0.16em] text-ink">{suggestion.label}</span>
                <span className="mt-1 block text-[11px] leading-4 text-muted">{suggestion.prompt}</span>
              </button>
            );
          })}
        </div>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submitStylistMessage();
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_UPLOAD_POLICY.acceptAttribute}
            capture={filePickerSource === "camera" ? "environment" : undefined}
            className="sr-only"
            aria-label="Upload a fashion item photo"
            onChange={(event) => void handleReferenceFiles(event.currentTarget.files)}
          />

          {pickerOpen ? (
            <div className="fixed inset-0 z-50 flex items-end bg-ink/30 px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:justify-center">
              <div role="dialog" aria-modal="true" aria-label="Choose photo source" className="w-full max-w-sm rounded-[1.75rem] border border-line bg-surface p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">Match a photo with your closet</p>
                    <p className="mt-1 text-xs leading-5 text-muted">Use a fashion item photo where the item is easy to see.</p>
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
                    Upload photo
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {activeReference ? (
            <div className="space-y-3" aria-live="polite">
              <ReferenceImageCard
                reference={activeReference}
                onClear={() => void clearActiveReference()}
                onAddToCloset={() => void addActiveReferenceToCloset(activeReference)}
                busy={referenceBusy}
              />
              {activeReference.status === "needs-selection" ? (
                <ReferenceSelectionCard
                  reference={activeReference}
                  onSelect={(detectedItemId) => void chooseDetectedReference(detectedItemId)}
                  busy={referenceBusy}
                />
              ) : null}
            </div>
          ) : referencePreviewUrl ? (
            <div className="rounded-2xl border border-line bg-canvas/70 p-3" aria-live="polite">
              <div className="flex items-center gap-3">
                <ImageFrame
                  src={referencePreviewUrl}
                  alt="Selected fashion item preview"
                  placeholder="Photo"
                  className="h-16 w-16 shrink-0 rounded-xl"
                />
                <div>
                  <p className="text-sm font-semibold text-ink">Photo selected</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{referenceMessage || "Preparing photo..."}</p>
                </div>
              </div>
            </div>
          ) : null}

          {referenceMessage && activeReference ? (
            <p className="rounded-2xl border border-line bg-canvas/60 px-3 py-2 text-xs font-semibold text-muted" aria-live="polite">
              {referenceMessage}
            </p>
          ) : null}

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={activeReference ? "Ask how to style this photo, or leave blank to match it with your closet..." : "Occasion, mood, weather, dress code..."}
            className="focus-ring min-h-28 w-full resize-none rounded-2xl border border-line bg-canvas/80 px-4 py-4 text-sm leading-6 text-ink outline-none placeholder:text-muted"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
              <input
                type="checkbox"
                checked={includeVisualization}
                onChange={(event) => setIncludeVisualization(event.target.checked)}
                className="h-4 w-4 rounded border-line accent-cocoa"
              />
              Avatar preview
            </label>
            <Button type="submit" disabled={loading || referenceBusy || (!message.trim() && activeReference?.status !== "ready")}>
              <Sparkles size={16} aria-hidden="true" />
              {loading ? "Styling..." : activeReference ? "Match my closet" : "Style me"}
            </Button>
          </div>
        </form>
      </Card>

      {error ? <p className="rounded-2xl border border-danger/25 bg-danger/10 px-3 py-2 text-xs font-semibold text-ink">{error}</p> : null}
      {toast ? <p className="rounded-2xl border border-success/25 bg-success/10 px-3 py-2 text-xs font-semibold text-success">{toast}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]">
        <Card className="min-h-[28rem] space-y-4 overflow-hidden border-olive/20 bg-gradient-to-br from-surface via-surface to-canvas">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">
                <MessageCircle size={14} aria-hidden="true" />
                Selected look
              </p>
              <h3 className="font-editorial mt-2 text-4xl font-semibold leading-none text-ink">
                {latestLook?.outfit?.title || (loading ? "Curating your look" : "No look selected yet")}
              </h3>
            </div>
            {latestLook?.outfit?.completenessStatus ? (
              <Badge tone={latestLook.outfit.completenessStatus === "complete" ? "success" : "warning"}>
                {completenessLabel(latestLook.outfit.completenessStatus)}
              </Badge>
            ) : null}
          </div>

          {latestLook ? (
            <>
              {renderLookStudio(latestLook)}
              <div className="rounded-2xl border border-line bg-canvas/60 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cocoa">Stylist notes</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">{latestLook.content}</p>
              </div>
            </>
          ) : loading ? (
            <div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-line bg-canvas/60 px-5 text-center">
              <div className="space-y-2">
                {loadingSteps.map((step) => (
                  <p key={step} className="text-sm font-semibold text-muted">{step}</p>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-line bg-canvas/60 px-5 text-center">
              <div>
                <Sparkles size={24} className="mx-auto mb-3 text-cocoa" aria-hidden="true" />
                <p className="font-editorial text-3xl font-semibold leading-none text-ink">Your styled look will appear here.</p>
                <p className="mt-2 text-xs leading-5 text-muted">Start with an occasion and MyFitPick will pull from your saved wardrobe.</p>
              </div>
            </div>
          )}
        </Card>

        <aside className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">Style brief</p>
              <Badge tone={includeVisualization ? "premium" : "neutral"}>
                {includeVisualization ? "Avatar on" : "Avatar off"}
              </Badge>
            </div>
            {requestHistory.length ? (
              <div className="space-y-2">
                {requestHistory.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="focus-ring w-full rounded-2xl border border-line bg-canvas/60 px-3 py-2 text-left text-xs leading-5 text-ink hover:border-cocoa/30"
                    onClick={() => setMessage(entry.content)}
                  >
                    {entry.attachment?.imageUrl ? (
                      <ImageFrame
                        src={entry.attachment.imageUrl}
                        alt="Reference photo from this styling request"
                        placeholder="Photo"
                        className="mb-2 h-20 rounded-xl"
                      />
                    ) : null}
                    {entry.content}
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-line bg-canvas/60 px-3 py-3 text-xs leading-5 text-muted">
                Tell MyFitPick the occasion, weather, dress code, and how dressed-up you want to feel.
              </p>
            )}
          </Card>

          <Card className="space-y-3">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
              <ArrowUpRight size={16} className="text-cocoa" aria-hidden="true" />
              Refine the edit
            </p>
            <div className="grid grid-cols-2 gap-2">
              {["More polished", "Simpler", "More formal", "More casual"].map((label) => (
                <Button
                  key={label}
                  type="button"
                  variant="secondary"
                  className="px-3 text-xs"
                  disabled={!latestLook?.outfit || loading}
                  onClick={() => void submitStylistMessage(`${label} for this ${latestLook?.outfit?.occasion || "look"}`, { includeVisualization: true })}
                >
                  {label}
                </Button>
              ))}
            </div>
          </Card>

          {latestAssistant && !latestLook ? (
            <Card className="space-y-3">
              <p className="text-sm font-semibold text-ink">Stylist notes</p>
              {latestAssistant.referenceItem ? (
                <ReferenceImageCard
                  reference={latestAssistant.referenceItem}
                  onAddToCloset={() => void addActiveReferenceToCloset(latestAssistant.referenceItem)}
                  busy={referenceBusy}
                />
              ) : null}
              <p className="whitespace-pre-wrap text-xs leading-5 text-muted">{latestAssistant.content}</p>
            </Card>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
