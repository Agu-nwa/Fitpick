"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import {
  generateAvatarPreview,
  getJobStatus,
  saveOutfit,
  sendStylistMessage
} from "@/lib/api-client";
import { simpleFitStatus, simplePreviewType } from "@/lib/copy/simple-copy";
import { completenessLabel } from "@/lib/recommendation/completeness";
import { cn } from "@/lib/utils";
import type { OutfitRecommendation, StylistAvatarPreview, StylistResponse, StylistVisualMode } from "@/types/outfit";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
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
  "Style me for church this Sunday",
  "Build a polished date night outfit",
  "What should I wear to a Nigerian wedding?",
  "Give me a business casual look for a hot day"
];

const loadingSteps = [
  "Choosing clothes from your wardrobe...",
  "Checking what matches...",
  "Showing it on your avatar..."
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
    errorMessage: preview?.errorMessage ?? null,
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

function ItemStrip({ outfit }: { outfit: OutfitRecommendation }) {
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-ink">Clothes from your closet</p>
      <div className="mobile-scrollbar flex gap-2 overflow-x-auto pb-1">
        {outfit.items.map((item) => (
          <div key={item.id} className="w-32 shrink-0 overflow-hidden rounded-xl border border-line bg-white">
            {item.thumbnailUrl || item.imageUrl ? (
              <img src={item.thumbnailUrl || item.imageUrl} alt={item.name} className="aspect-square w-full object-cover" />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-canvas px-2 text-center text-xs text-muted">
                {item.category}
              </div>
            )}
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
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [includeVisualization, setIncludeVisualization] = useState(true);
  const recentMessages = useMemo(() => messages.slice(-8), [messages]);

  function patchMessage(id: string, patch: Partial<ChatMessage>) {
    setMessages((current) => current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  function showToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(""), 1800);
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
            errorMessage: job.errorMessage || "Unable to show it on your avatar right now."
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
    if (!trimmed || loading) return;

    const userEntry: ChatMessage = { id: messageId(), role: "user", content: trimmed };
    const assistantId = messageId();
    const assistantEntry: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "Choosing clothes from your wardrobe..."
    };
    const sessionMessages = [...messages, userEntry, assistantEntry];

    setLoading(true);
    setError("");
    setMessage("");
    setMessages(sessionMessages);

    const response = await sendStylistMessage(trimmed, {
      includeVisualization: options.includeVisualization ?? includeVisualization,
      visualMode: options.visualMode || "digital_human",
      recentMessages: recentMessages.map((entry) => ({ role: entry.role, content: entry.content }))
    });

    setLoading(false);

    if (!response.ok) {
      const safeMessage = response.error.message || "Unable to reach FitPick Stylist right now.";
      setError(safeMessage);
      patchMessage(assistantId, { content: safeMessage });
      return;
    }

    const avatarPreview = compactPreview(response.data.avatarPreview || response.data.stylist.avatarPreview);
    const jobId = response.data.job?.id || avatarPreview.jobId || null;
    patchMessage(assistantId, {
      content: response.data.reply,
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
          errorMessage: result.error.message || "Unable to show it on your avatar right now."
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
        errorMessage: preview.errorMessage || null,
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

  function renderAssistantAddOns(entry: ChatMessage) {
    const outfit = entry.outfit;
    const preview = entry.avatarPreview;
    const status = preview?.status || "not_started";
    const hasVisualization = entry.visualMode === "digital_human" || Boolean(entry.outfitRecommendationId);

    return (
      <>
        {outfit ? <ItemStrip outfit={outfit} /> : null}

        {hasVisualization ? (
          <div className="mt-3 rounded-xl border border-line bg-canvas p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={previewTone(status)}>{previewLabel(status)}</Badge>
              {entry.outfitRecommendationId ? <Badge tone="neutral">Look {entry.outfitRecommendationId.slice(-6)}</Badge> : null}
              {outfit?.completenessStatus ? <Badge tone={outfit.completenessStatus === "complete" ? "success" : "warning"}>{completenessLabel(outfit.completenessStatus)}</Badge> : null}
            </div>

            {preview?.imageUrl ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-line bg-white">
                <img src={preview.imageUrl} alt="FitPick avatar outfit preview" className="aspect-square w-full object-cover" />
              </div>
            ) : status === "queued" || status === "generating" || status === "processing" ? (
              <div className="mt-3 flex min-h-40 items-center justify-center rounded-xl border border-dashed border-line bg-white px-4 text-center">
                <p className="text-sm font-semibold text-cocoa">Showing it on your avatar...</p>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-line bg-white px-4 py-5 text-center">
                <p className="text-sm leading-6 text-muted">
                  {preview?.errorMessage || "Your avatar preview will appear here when available."}
                </p>
              </div>
            )}

            <p className="mt-3 text-xs leading-5 text-muted">This is a preview, not a perfect fitting.</p>
            {(entry.fitLock?.warnings?.length || preview?.fitWarnings?.length) ? (
              <div className="mt-3 space-y-1 rounded-xl border border-warning/20 bg-warning/10 p-3">
                {(entry.fitLock?.warnings || preview?.fitWarnings || []).slice(0, 3).map((warning) => (
                  <p key={warning} className="text-xs leading-5 text-ink">{warning}</p>
                ))}
              </div>
            ) : null}
            {outfit?.completenessWarnings?.length ? (
              <div className="mt-3 space-y-1 rounded-xl border border-warning/20 bg-warning/10 p-3">
                {outfit.completenessWarnings.slice(0, 2).map((warning) => (
                  <p key={warning} className="text-xs leading-5 text-ink">{warning}</p>
                ))}
              </div>
            ) : null}
            <details className="mt-3 rounded-xl border border-line bg-white p-3">
              <summary className="cursor-pointer text-xs font-semibold text-ink">Preview details</summary>
              <div className="mt-3 flex flex-wrap gap-2">
                {preview?.accuracyLevel ? <Badge tone={preview.accuracyLevel.id === "fit_locked" ? "success" : "premium"}>Preview type: {simplePreviewType(preview.accuracyLevel)}</Badge> : null}
                {entry.fitLock?.fitStatus ? <Badge tone={entry.fitLock.fitStatus === "likely_fits" ? "success" : "warning"}>Fit: {simpleFitStatus(entry.fitLock.fitStatus)}</Badge> : null}
                {preview?.visualGroundingStatus ? <Badge tone={preview.visualGroundingStatus === "grounded" ? "success" : "warning"}>{preview.visualGroundingStatus === "grounded" ? "Grounded" : "Needs review"}</Badge> : null}
                {entry.jobId ? <Badge tone="neutral">Job {entry.jobId.slice(-8)}</Badge> : null}
              </div>
            </details>

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
                  <Button type="button" variant="ghost" onClick={() => void submitStylistMessage(`Make this ${outfit.occasion || "look"} smarter`, { includeVisualization: true })}>
                    Make it smarter
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
    <section className="space-y-4 pb-4">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-ink">Your personal stylist</p>
            <p className="mt-1 text-xs leading-5 text-muted">FitPick answers using your saved clothes and style preferences.</p>
          </div>
          <Badge tone="premium">Wardrobe-only</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {promptSuggestions.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="focus-ring rounded-full"
              onClick={() => setMessage(prompt)}
              disabled={loading}
            >
              <Chip>{prompt}</Chip>
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1" aria-live="polite">
          {messages.length ? (
            messages.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm leading-6",
                  entry.role === "user" ? "ml-8 bg-cocoa text-white" : "mr-2 border border-line bg-white text-ink sm:mr-8"
                )}
              >
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] opacity-80">
                  {entry.role === "user" ? "You" : "FitPick Stylist"}
                </p>
                <p className="whitespace-pre-wrap">{entry.content}</p>
                {entry.role === "assistant" ? renderAssistantAddOns(entry) : null}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-white px-4 py-5 text-center">
              <p className="text-sm font-semibold text-ink">Ask what to wear</p>
              <p className="mt-2 text-xs leading-5 text-muted">Tell FitPick the occasion, weather, or mood. It will choose from clothes you own.</p>
            </div>
          )}

          {loading ? (
            <div className="mr-8 rounded-2xl border border-line bg-white px-3 py-2 text-sm leading-6 text-muted">
              <div className="space-y-1">
                {loadingSteps.map((step) => <p key={step}>{step}</p>)}
              </div>
            </div>
          ) : null}
        </div>

        {error ? <p className="rounded-2xl bg-danger/10 px-3 py-2 text-xs font-semibold text-ink">{error}</p> : null}
        {toast ? <p className="rounded-2xl bg-success/10 px-3 py-2 text-xs font-semibold text-success">{toast}</p> : null}

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submitStylistMessage();
          }}
        >
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask FitPick what to wear..."
            className="focus-ring min-h-28 w-full resize-none rounded-2xl border border-line bg-white px-3 py-3 text-sm leading-6 text-ink outline-none placeholder:text-muted"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink">
              <input
                type="checkbox"
                checked={includeVisualization}
                onChange={(event) => setIncludeVisualization(event.target.checked)}
                className="h-4 w-4 rounded border-line text-cocoa"
              />
              See it on my avatar
            </label>
            <Badge tone={includeVisualization ? "premium" : "neutral"}>
              {includeVisualization ? "Avatar preview on" : "Text only"}
            </Badge>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !message.trim()}>
            {loading ? "Styling..." : "Ask FitPick"}
          </Button>
        </form>
      </Card>
    </section>
  );
}
