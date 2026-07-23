"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthRequiredState } from "@/components/integration/AuthRequiredState";
import { BackendUnavailableState } from "@/components/integration/BackendUnavailableState";
import { LoadingCard } from "@/components/integration/LoadingCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { Toast } from "@/components/ui/Toast";
import { PreviewDownloadButton } from "@/components/outfit/PreviewDownloadButton";
import { useSession } from "@/hooks/use-session";
import { generateAvatarPreview, getAvatarPreview, getJobStatus, getOutfit, saveOutfit, type AvatarPreviewData } from "@/lib/api-client";
import { completenessLabel } from "@/lib/recommendation/completeness";
import { safeTryOnErrorMessage, safeUserMessage } from "@/lib/user-facing-errors";
import type { OutfitRecommendation, ReferenceFashionItemSummary } from "@/types/outfit";
import type { WardrobeItem } from "@/types/wardrobe";

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isFootwear(item: WardrobeItem) {
  return item.category === "shoes" || /shoe|sneaker|loafer|sandal|boot|heel|slipper/i.test(`${item.name} ${item.subcategory}`);
}

function isReferenceFootwear(item: ReferenceFashionItemSummary) {
  return item.category === "shoes" || /shoe|sneaker|loafer|sandal|boot|heel|slipper/i.test(`${item.subcategory || ""} ${item.analysisSummary || ""}`);
}

function itemImage(item: WardrobeItem) {
  return item.thumbnailUrl || item.imageUrl || item.images?.front?.url || "";
}

function referenceLabel(item: ReferenceFashionItemSummary) {
  return [item.primaryColor, item.subcategory || item.category].filter(Boolean).join(" ").trim() || "Uploaded fashion item";
}

function isPreviewReady(preview: AvatarPreviewData["preview"] | null, imageUrl: string) {
  return preview?.status === "ready" && Boolean(imageUrl);
}

function isPreviewProcessing(preview: AvatarPreviewData["preview"] | null, generating: boolean) {
  return generating || preview?.status === "generating";
}

function isPreviewFailed(preview: AvatarPreviewData["preview"] | null, error: string) {
  return Boolean(error) || preview?.status === "failed";
}

function createClientIdempotencyKey(prefix: string) {
  const randomPart = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${randomPart}`.slice(0, 120);
}

export function LookPreviewClient({ outfitId }: { outfitId: string }) {
  const session = useSession();
  const [outfit, setOutfit] = useState<OutfitRecommendation | null>(null);
  const [preview, setPreview] = useState<AvatarPreviewData["preview"] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "not-found" | "unavailable" | "error">("idle");
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const referenceItems = useMemo(() => outfit?.referenceItems?.filter((item) => item?.imageUrl) || [], [outfit]);
  const referenceFootwear = useMemo(() => referenceItems.find(isReferenceFootwear) || null, [referenceItems]);
  const footwear = useMemo(() => outfit?.items.find(isFootwear) || null, [outfit]);
  const footwearLabel = footwear?.name || (referenceFootwear ? referenceLabel(referenceFootwear) : "");
  const missingShoes = Boolean(outfit && !footwearLabel);

  const loadLook = useCallback(async () => {
    setStatus("loading");
    setError("");
    const [outfitResult, previewResult] = await Promise.all([getOutfit(outfitId), getAvatarPreview(outfitId)]);

    if (!outfitResult.ok) {
      setStatus(outfitResult.error.code === "NOT_FOUND" ? "not-found" : outfitResult.error.code === "INTERNAL_ERROR" ? "unavailable" : "error");
      return;
    }

    setOutfit(outfitResult.data.outfit);
    if (previewResult.ok) {
      setPreview(previewResult.data.preview);
    }
    setStatus("ready");
  }, [outfitId]);

  useEffect(() => {
    if (session.status === "authenticated") void loadLook();
  }, [loadLook, session.status]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  async function pollPreviewJob(jobId: string) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await wait(2500);
      const result = await getJobStatus(jobId);
      if (!result.ok) continue;

      if (result.data.job.status === "completed") {
        const refreshed = await getAvatarPreview(outfitId);
        if (refreshed.ok) {
          setPreview(refreshed.data.preview);
        }
        showToast("Avatar preview ready.");
        return;
      }

      if (result.data.job.status === "failed" || result.data.job.status === "cancelled" || result.data.job.status === "dead_letter") {
        const message = safeTryOnErrorMessage(result.data.job.errorMessage);
        setError(message);
        setPreview((current) => current ? { ...current, status: "failed", errorMessage: message } : current);
        setGenerating(false);
        return;
      }
    }
    setError("This avatar preview is still being prepared. Check back shortly.");
  }

  async function handleGenerate(regenerate = false) {
    setGenerating(true);
    setError("");
    const result = await generateAvatarPreview(outfitId, {
      regenerate,
      idempotencyKey: createClientIdempotencyKey("avatar-preview")
    });
    setGenerating(false);

    if (!result.ok) {
      setError(safeUserMessage(result.error, "Unable to show it on your avatar right now."));
      return;
    }

    setPreview(result.data.preview);
    const jobId = result.data.job?.id;
    if (jobId && result.data.preview.status !== "ready") {
      showToast("Avatar preview is being prepared.");
      void pollPreviewJob(jobId);
      return;
    }
    showToast("Avatar preview ready.");
  }

  async function handleSave() {
    if (!outfit) return;
    const result = await saveOutfit(outfit.id, { title: outfit.title, favorite: false });
    showToast(result.ok ? "Look saved." : "Unable to save look right now.");
  }

  if (session.status === "loading" || status === "loading" || (session.status === "authenticated" && status === "idle")) return <LoadingCard title="Loading full look" />;
  if (session.status === "logged-out") return <AuthRequiredState />;
  if (session.status === "backend-unavailable" || status === "unavailable") return <BackendUnavailableState onRetry={session.status === "backend-unavailable" ? session.refresh : loadLook} />;
  if (status === "not-found" || !outfit) {
    return (
      <Card className="p-5">
        <p className="text-base font-semibold text-ink">Look not found</p>
        <p className="mt-2 text-sm leading-6 text-muted">This outfit preview is not available.</p>
        <Link href="/outfit"><Button className="mt-4 w-full">Pick another outfit</Button></Link>
      </Card>
    );
  }
  if (status === "error") {
    return (
      <Card className="p-5">
        <p className="text-base font-semibold text-ink">Look unavailable</p>
        <p className="mt-2 text-sm leading-6 text-muted">We could not load this look right now.</p>
        <Button className="mt-4 w-full" onClick={() => void loadLook()}>Try again</Button>
      </Card>
    );
  }

  const imageUrl = preview?.imageUrl || preview?.previewUrl || outfit.preview?.imageUrl || "";
  const previewReady = isPreviewReady(preview, imageUrl);
  const previewProcessing = isPreviewProcessing(preview, generating);
  const previewFailed = !previewProcessing && isPreviewFailed(preview, error);
  const hasPreviewStarted = Boolean(preview && preview.status !== "not_started");

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-8">
        <div className="absolute right-[-5rem] top-[-6rem] size-60 rounded-full bg-cocoa/10 blur-3xl" />
        <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-terracotta">Full look</p>
        <h1 className="mt-2 font-editorial text-4xl font-semibold leading-[0.98] tracking-editorial text-ink sm:text-5xl lg:text-6xl">{outfit.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{outfit.occasionFit || outfit.summary}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.85fr)] lg:items-start">
        <section className="space-y-4">
          <Card className="overflow-hidden p-0">
            {imageUrl ? (
              <ImageFrame
                src={imageUrl}
                alt={`${outfit.title} avatar preview`}
                aspect="portrait"
                placeholder="Avatar preview"
                className="min-h-[420px] rounded-none border-0 bg-canvas sm:min-h-[560px]"
              />
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center bg-canvas/60 px-6 text-center sm:min-h-[560px]">
                <p className="text-lg font-semibold text-ink">No virtual try-on yet.</p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
                  Create a preview with the selected closet items.
                </p>
              </div>
            )}
          </Card>
        </section>

        <aside className="space-y-4">
          <Card className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge tone={outfit.completenessStatus === "complete" ? "success" : "warning"}>{completenessLabel(outfit.completenessStatus)}</Badge>
              {referenceItems.length ? <Badge tone="premium">Photo match</Badge> : null}
            </div>
            <p className="text-sm leading-6 text-muted">
              This is a preview, not a perfect fitting.
            </p>
          </Card>

          {referenceItems.length ? (
            <Card className="space-y-3">
              <p className="text-sm font-semibold text-ink">Uploaded photo anchor</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
                {referenceItems.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-cocoa/20 bg-cocoa/10 p-2">
                    <ImageFrame src={item.imageUrl} alt={referenceLabel(item)} aspect="square" placeholder={item.category || "Uploaded item"} className="mb-2" />
                    <p className="line-clamp-2 text-xs font-semibold leading-4 text-ink">{referenceLabel(item)}</p>
                    <p className="mt-1 truncate text-[11px] text-muted">{[item.primaryColor, item.category].filter(Boolean).join(" · ") || "Photo upload"}</p>
                  </article>
                ))}
              </div>
            </Card>
          ) : null}

          <Card className="space-y-3">
            <p className="text-sm font-semibold text-ink">Closet items in this look</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
              {outfit.items.map((item) => (
                <article key={item.id} className="rounded-2xl border border-line bg-canvas/60 p-2">
                  <ImageFrame src={itemImage(item)} alt={item.name} aspect="square" placeholder={item.category} className="mb-2" />
                  <p className="line-clamp-2 text-xs font-semibold leading-4 text-ink">{item.name}</p>
                  <p className="mt-1 truncate text-[11px] text-muted">{[item.color, item.category].filter(Boolean).join(" · ")}</p>
                </article>
              ))}
            </div>
          </Card>

          {footwearLabel ? (
            <Card className="space-y-2 border-success/20 bg-success/10">
              <p className="text-sm font-semibold text-ink">Footwear included</p>
              <p className="text-sm leading-6 text-muted">{footwearLabel}</p>
            </Card>
          ) : (
            <Card className="space-y-3 border-warning/25 bg-warning/10">
              <p className="text-sm font-semibold text-ink">Shoes are missing</p>
              <p className="text-sm leading-6 text-ink">Add shoes for a complete outfit.</p>
            </Card>
          )}

          <Card className="space-y-3">
            {previewReady ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <Button onClick={() => void handleSave()}>Save Look</Button>
                <PreviewDownloadButton outfitId={outfit.id} />
              </div>
            ) : null}

            {previewProcessing ? (
              <div className="rounded-2xl border border-line bg-canvas/70 px-4 py-5 text-center">
                <div className="mx-auto size-8 animate-spin rounded-full border-2 border-cocoa/20 border-t-cocoa" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-ink">Creating your preview...</p>
              </div>
            ) : null}

            {previewFailed ? (
              <div className="space-y-3">
                <p className="rounded-2xl bg-danger/10 px-3 py-3 text-sm font-semibold text-ink">
                  {"Virtual Try-On couldn't be completed."}
                </p>
                {!generating ? <Button onClick={() => void handleGenerate(true)}>Retry Try-On</Button> : null}
              </div>
            ) : null}

            {!hasPreviewStarted && !previewProcessing && !previewFailed ? (
              <Button onClick={() => void handleGenerate(false)}>Generate Virtual Try-On</Button>
            ) : null}
          </Card>
        </aside>
      </div>
      <Toast show={Boolean(toast)} message={toast} />
    </div>
  );
}
