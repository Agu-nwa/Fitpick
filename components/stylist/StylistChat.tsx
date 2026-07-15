"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, CloudRain, HeartHandshake, MessageCircle, Sparkles, WandSparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cocoa">Clothes from your closet</p>
      <div className="mobile-scrollbar flex gap-2 overflow-x-auto pb-1">
        {outfit.items.map((item) => (
          <div key={item.id} className="w-32 shrink-0 overflow-hidden rounded-xl border border-line bg-surface/80">
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
      content: "Reading your wardrobe..."
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

  function renderLookStudio(entry: ChatMessage) {
    const outfit = entry.outfit;
    const preview = entry.avatarPreview;
    const status = preview?.status || "not_started";
    const hasVisualization = entry.visualMode === "digital_human" || Boolean(entry.outfitRecommendationId);

    return (
      <>
        {outfit ? <ItemStrip outfit={outfit} /> : null}

        {hasVisualization ? (
          <div className="rounded-2xl border border-line bg-canvas/60 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={previewTone(status)}>{previewLabel(status)}</Badge>
              {entry.outfitRecommendationId ? <Badge tone="neutral">Look {entry.outfitRecommendationId.slice(-6)}</Badge> : null}
              {outfit?.completenessStatus ? <Badge tone={outfit.completenessStatus === "complete" ? "success" : "warning"}>{completenessLabel(outfit.completenessStatus)}</Badge> : null}
            </div>

            {preview?.imageUrl ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-line bg-surface/80">
                <img src={preview.imageUrl} alt="FitPick avatar outfit preview" className="aspect-square w-full object-cover" />
              </div>
            ) : status === "queued" || status === "generating" || status === "processing" ? (
              <div className="mt-3 flex min-h-40 items-center justify-center rounded-xl border border-dashed border-line bg-surface/60 px-4 text-center">
                <p className="text-sm font-semibold text-cocoa">Showing it on your avatar...</p>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-line bg-surface/60 px-4 py-5 text-center">
                <p className="text-sm leading-6 text-muted">
                  {preview?.errorMessage || "Your avatar preview will appear here when available."}
                </p>
              </div>
            )}

            <p className="mt-3 text-xs leading-5 text-muted">Preview accuracy depends on the saved item photos and avatar details.</p>
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
            <details className="mt-3 rounded-xl border border-line bg-surface/70 p-3">
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
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Give the stylist an occasion, mood, setting, or dress code. FitPick will work from your saved closet.</p>
          </div>
          <Badge tone="premium">Closet-led</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
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
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Occasion, mood, weather, dress code..."
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
            <Button type="submit" disabled={loading || !message.trim()}>
              <Sparkles size={16} aria-hidden="true" />
              {loading ? "Styling..." : "Style me"}
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
                <p className="mt-2 text-xs leading-5 text-muted">Start with an occasion and FitPick will pull from your saved wardrobe.</p>
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
                    {entry.content}
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-line bg-canvas/60 px-3 py-3 text-xs leading-5 text-muted">
                Tell FitPick the occasion, weather, dress code, and how dressed-up you want to feel.
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
            <Card className="space-y-2">
              <p className="text-sm font-semibold text-ink">Stylist notes</p>
              <p className="whitespace-pre-wrap text-xs leading-5 text-muted">{latestAssistant.content}</p>
            </Card>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
