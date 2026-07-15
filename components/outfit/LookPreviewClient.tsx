"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthRequiredState } from "@/components/integration/AuthRequiredState";
import { BackendUnavailableState } from "@/components/integration/BackendUnavailableState";
import { LoadingCard } from "@/components/integration/LoadingCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CTABar } from "@/components/ui/CTABar";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { Toast } from "@/components/ui/Toast";
import { useSession } from "@/hooks/use-session";
import { generateAvatarPreview, getAvatarPreview, getJobStatus, getOutfit, saveOutfit, type AvatarPreviewData } from "@/lib/api-client";
import { completenessLabel } from "@/lib/recommendation/completeness";
import type { OutfitRecommendation } from "@/types/outfit";
import type { WardrobeItem } from "@/types/wardrobe";

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isFootwear(item: WardrobeItem) {
  return item.category === "shoes" || /shoe|sneaker|loafer|sandal|boot|heel|slipper/i.test(`${item.name} ${item.subcategory}`);
}

function itemImage(item: WardrobeItem) {
  return item.thumbnailUrl || item.imageUrl || item.images?.front?.url || "";
}

export function LookPreviewClient({ outfitId }: { outfitId: string }) {
  const session = useSession();
  const [outfit, setOutfit] = useState<OutfitRecommendation | null>(null);
  const [preview, setPreview] = useState<AvatarPreviewData["preview"] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "not-found" | "unavailable" | "error">("idle");
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const footwear = useMemo(() => outfit?.items.find(isFootwear) || null, [outfit]);
  const missingShoes = Boolean(outfit && !footwear);
  const warnings = useMemo(() => {
    const messages = [
      ...(outfit?.completenessWarnings || []),
      ...(preview?.visualizationWarnings || []),
      ...(preview?.fitWarnings || [])
    ];
    if (missingShoes) messages.unshift("Shoes are missing from this look.");
    messages.unshift("This is a preview, not a perfect fitting.");
    return Array.from(new Set(messages.filter(Boolean))).slice(0, 8);
  }, [missingShoes, outfit?.completenessWarnings, preview?.fitWarnings, preview?.visualizationWarnings]);

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

      if (result.data.job.status === "failed" || result.data.job.status === "cancelled") {
        setError(result.data.job.errorMessage || "Unable to show it on your avatar right now.");
        return;
      }
    }
    setError("This avatar preview is still being prepared. Check back shortly.");
  }

  async function handleGenerate(regenerate = false) {
    setGenerating(true);
    setError("");
    const result = await generateAvatarPreview(outfitId, { regenerate });
    setGenerating(false);

    if (!result.ok) {
      setError(result.error.message || "Unable to show it on your avatar right now.");
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
        <p className="mt-2 text-sm leading-6 text-muted">This saved look is not available.</p>
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

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-8">
        <div className="absolute right-[-5rem] top-[-6rem] size-60 rounded-full bg-cocoa/10 blur-3xl" />
        <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-terracotta">Full look</p>
        <h1 className="mt-2 font-editorial text-5xl font-semibold leading-[0.9] tracking-editorial text-ink sm:text-6xl lg:text-7xl">{outfit.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{outfit.occasionFit || outfit.summary}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.85fr)] lg:items-start">
        <section className="space-y-4">
          <Card className="overflow-hidden p-0">
            {imageUrl ? (
              <img src={imageUrl} alt={`${outfit.title} avatar preview`} className="min-h-[420px] w-full bg-canvas object-cover sm:min-h-[560px]" />
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center bg-canvas/60 px-6 text-center sm:min-h-[560px]">
                <p className="text-lg font-semibold text-ink">No virtual try-on yet.</p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
                  Generate a photorealistic model wearing the exact selected closet items.
                </p>
                <Button className="mt-5" onClick={() => void handleGenerate(false)} disabled={generating}>{generating ? "Preparing..." : "Generate virtual try-on"}</Button>
              </div>
            )}
          </Card>
        </section>

        <aside className="space-y-4">
          <Card className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge tone={outfit.completenessStatus === "complete" ? "success" : "warning"}>{completenessLabel(outfit.completenessStatus)}</Badge>
              <Badge tone={preview?.visualGroundingStatus === "grounded" ? "success" : "warning"}>{preview?.visualGroundingStatus === "grounded" ? "Grounded preview" : "Preview needs review"}</Badge>
            </div>
            <p className="text-sm leading-6 text-muted">
              This look uses the selected closet item IDs. The generated image is an on-model virtual try-on, not a perfect fitting.
            </p>
          </Card>

          {warnings.length ? (
            <Card className="space-y-2 border-warning/25 bg-warning/10">
              <p className="text-sm font-semibold text-ink">Fit note</p>
              {warnings.slice(0, 5).map((warning) => <p key={warning} className="text-sm leading-6 text-ink">{warning}</p>)}
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

          {footwear ? (
            <Card className="space-y-2 border-success/20 bg-success/10">
              <p className="text-sm font-semibold text-ink">Footwear included</p>
              <p className="text-sm leading-6 text-muted">{footwear.name}</p>
            </Card>
          ) : (
            <Card className="space-y-3 border-warning/25 bg-warning/10">
              <p className="text-sm font-semibold text-ink">Shoes are missing</p>
              <p className="text-sm leading-6 text-ink">Add shoes for a complete outfit.</p>
              <Link href="/wardrobe/add"><Button className="w-full" variant="secondary">Add missing shoes</Button></Link>
            </Card>
          )}

          <Card className="space-y-3">
            <p className="text-sm font-semibold text-ink">Why it works</p>
            <p className="text-sm leading-6 text-muted">{outfit.whyItWorks || outfit.summary}</p>
            {outfit.materialNote ? <p className="text-sm leading-6 text-muted">{outfit.materialNote}</p> : null}
            {outfit.silhouetteNote ? <p className="text-sm leading-6 text-muted">{outfit.silhouetteNote}</p> : null}
          </Card>

          {error ? <p className="rounded-2xl bg-danger/10 px-3 py-2 text-sm font-semibold text-ink">{error}</p> : null}

          <CTABar className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <Button onClick={() => void handleSave()}>Save look</Button>
            <Link href="/outfit"><Button variant="secondary" className="w-full">Try another look</Button></Link>
            <Button variant="secondary" onClick={() => void handleGenerate(true)} disabled={generating}>{generating ? "Preparing..." : "Regenerate try-on"}</Button>
            <Link href="/avatar"><Button variant="ghost" className="w-full">Edit avatar</Button></Link>
          </CTABar>
        </aside>
      </div>
      <Toast show={Boolean(toast)} message={toast} />
    </div>
  );
}
