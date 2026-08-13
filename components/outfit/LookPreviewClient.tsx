"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellRing, CheckCircle2, Clock3, Layers3, RotateCcw, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { AuthRequiredState } from "@/components/integration/AuthRequiredState";
import { BackendUnavailableState } from "@/components/integration/BackendUnavailableState";
import { LoadingCard } from "@/components/integration/LoadingCard";
import { PreviewDownloadButton } from "@/components/outfit/PreviewDownloadButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { ImagePreviewDialog, type ImagePreviewDialogImage } from "@/components/ui/ImagePreviewDialog";
import { Toast } from "@/components/ui/Toast";
import { useRevealContent } from "@/hooks/use-reveal-content";
import { useSession } from "@/hooks/use-session";
import { generateAvatarPreview, getAvatarPreview, getOutfit, saveOutfit, type AvatarPreviewData } from "@/lib/api-client";
import { getCreditCost } from "@/lib/credits/credit-costs";
import { completenessLabel } from "@/lib/recommendation/completeness";
import { editorialLookCopy } from "@/lib/recommendation/editorial-look-copy";
import { buildOutfitPresentationItems } from "@/lib/recommendation/outfit-presentation";
import {
  creditRestorationConfirmed,
  deriveTryOnPreviewUiState,
  resolveTryOnOrigin,
  shouldPollTryOnPreview,
  tryOnOriginDestination,
  tryOnOriginLabel
} from "@/lib/tryon/preview-ui-state";
import { safeTryOnErrorMessage, safeUserMessage } from "@/lib/user-facing-errors";
import type { OutfitRecommendation, ReferenceFashionItemSummary } from "@/types/outfit";
import type { WardrobeItem } from "@/types/wardrobe";

const pollDelays = [2500, 4000, 6500, 10_000, 15_000];
const virtualTryOnCreditCost = getCreditCost("virtual_try_on");
const regenerateTryOnCreditCost = getCreditCost("regenerate_try_on");

function isFootwear(item: WardrobeItem) {
  return item.category === "shoes" || /shoe|sneaker|loafer|sandal|boot|heel|slipper/i.test(`${item.name} ${item.subcategory}`);
}

function isReferenceFootwear(item: ReferenceFashionItemSummary) {
  return item.category === "shoes" || /shoe|sneaker|loafer|sandal|boot|heel|slipper/i.test(`${item.subcategory || ""} ${item.analysisSummary || ""}`);
}

function referenceLabel(item: ReferenceFashionItemSummary) {
  return [item.primaryColor, item.subcategory || item.category].filter(Boolean).join(" ").trim() || "Uploaded fashion item";
}

function isAccessoryCategory(category?: string) {
  return /accessor|jewelry|jewellery|watch|bracelet|bangle|necklace|earring|bag|handbag|belt/i.test(category || "");
}

function createClientIdempotencyKey(prefix: string) {
  const randomPart = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${randomPart}`.slice(0, 120);
}

export function LookPreviewClient({ outfitId, initialOrigin }: { outfitId: string; initialOrigin?: string }) {
  const session = useSession();
  const [outfit, setOutfit] = useState<OutfitRecommendation | null>(null);
  const [preview, setPreview] = useState<AvatarPreviewData["preview"] | null>(null);
  const [generation, setGeneration] = useState<AvatarPreviewData["generation"]>(null);
  const [job, setJob] = useState<AvatarPreviewData["job"] | null>(null);
  const [avatarProfile, setAvatarProfile] = useState<AvatarPreviewData["avatarProfile"] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "not-found" | "unavailable" | "error">("idle");
  const [requestPending, setRequestPending] = useState(false);
  const [toast, setToast] = useState("");
  const [localError, setLocalError] = useState("");
  const [pollWarning, setPollWarning] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [viewingImage, setViewingImage] = useState<ImagePreviewDialogImage | null>(null);
  const previewStageRef = useRef<HTMLElement>(null);
  const pollAttemptRef = useRef(0);
  const previousPreviewStateRef = useRef<string>("");
  const revealContent = useRevealContent();

  const referenceItems = useMemo(() => outfit?.referenceItems?.filter((item) => item?.imageUrl) || [], [outfit]);
  const presentationItems = useMemo(() => outfit ? buildOutfitPresentationItems(outfit) : [], [outfit]);
  const referenceFootwear = useMemo(() => referenceItems.find(isReferenceFootwear) || null, [referenceItems]);
  const footwear = useMemo(() => outfit?.items.find(isFootwear) || null, [outfit]);
  const footwearLabel = footwear?.name || (referenceFootwear ? referenceLabel(referenceFootwear) : "");
  const accessoryCount = useMemo(() => presentationItems.filter((item) => isAccessoryCategory(item.category)).length, [presentationItems]);
  const studioModelReady = Boolean(avatarProfile && (
    avatarProfile.tryOnModelSource !== "none"
    || avatarProfile.studioModelImageUrl
    || avatarProfile.generatedModelImageUrl
    || avatarProfile.uploadedModelImageUrl
  ));

  const imageUrl = preview?.imageUrl || preview?.previewUrl || outfit?.preview?.imageUrl || "";
  const previewState = deriveTryOnPreviewUiState({
    preview: preview || outfit?.preview || null,
    generation,
    job,
    imageUrl,
    requestPending,
    localFailure: Boolean(localError),
    now
  });
  const origin = resolveTryOnOrigin(initialOrigin, outfit);
  const originHref = tryOnOriginDestination(origin);
  const originLabel = tryOnOriginLabel(origin);
  const creditRestored = creditRestorationConfirmed({ preview: preview || outfit?.preview || null, generation });
  const progressStage = preview?.progressStage || outfit?.preview?.progressStage || "not_started";
  const providerCompletedItemIds = new Set(preview?.providerCompletedItemIds || outfit?.preview?.providerCompletedItemIds || []);
  const pendingItemIds = new Set(preview?.pendingItemIds || outfit?.preview?.pendingItemIds || []);
  const recommendationOnlyItemIds = new Set(preview?.recommendationOnlyItemIds || outfit?.preview?.recommendationOnlyItemIds || []);
  const progressiveCoreReady = Boolean(
    imageUrl
    && (previewState === "processing" || previewState === "delayed")
    && (progressStage === "core_ready" || progressStage === "finishing")
  );

  const loadLook = useCallback(async () => {
    setStatus("loading");
    setLocalError("");
    const [outfitResult, previewResult] = await Promise.all([getOutfit(outfitId), getAvatarPreview(outfitId)]);

    if (!outfitResult.ok) {
      setStatus(outfitResult.error.code === "NOT_FOUND" ? "not-found" : outfitResult.error.code === "INTERNAL_ERROR" ? "unavailable" : "error");
      return;
    }

    setOutfit(outfitResult.data.outfit);
    if (previewResult.ok) {
      setPreview(previewResult.data.preview);
      setGeneration(previewResult.data.generation || null);
      setJob(previewResult.data.job || null);
      setAvatarProfile(previewResult.data.avatarProfile || null);
    }
    setStatus("ready");
  }, [outfitId]);

  useEffect(() => {
    if (session.status === "authenticated") void loadLook();
  }, [loadLook, session.status]);

  useEffect(() => {
    if (!shouldPollTryOnPreview(previewState)) return;
    const interval = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(interval);
  }, [previewState]);

  useEffect(() => {
    if (!shouldPollTryOnPreview(previewState)) {
      pollAttemptRef.current = 0;
      return;
    }

    let cancelled = false;
    let timer = 0;

    const poll = async () => {
      const result = await getAvatarPreview(outfitId);
      if (cancelled) return;

      if (result.ok) {
        setPreview(result.data.preview);
        setGeneration(result.data.generation || null);
        setJob(result.data.job || null);
        setAvatarProfile(result.data.avatarProfile || null);
        setPollWarning("");
      } else {
        setPollWarning("We’re still checking your preview. It will continue processing while the connection recovers.");
      }

      pollAttemptRef.current += 1;
      const delay = pollDelays[Math.min(pollAttemptRef.current, pollDelays.length - 1)];
      timer = window.setTimeout(poll, delay);
    };

    const initialDelay = pollDelays[Math.min(pollAttemptRef.current, pollDelays.length - 1)];
    timer = window.setTimeout(poll, initialDelay);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [outfitId, previewState]);

  useEffect(() => {
    const previous = previousPreviewStateRef.current;
    if (previewState === "completed" && previous && previous !== "completed") {
      setToast("Your Virtual Try-On is ready.");
      revealContent(previewStageRef, { delayMs: 90, topOffset: 24, bottomOffset: 136 });
    }
    previousPreviewStateRef.current = previewState;
  }, [previewState, revealContent]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  async function handleGenerate(regenerate = false) {
    setRequestPending(true);
    setLocalError("");
    setPollWarning("");
    revealContent(previewStageRef, { delayMs: 60, topOffset: 24, bottomOffset: 136 });
    const result = await generateAvatarPreview(outfitId, {
      regenerate,
      idempotencyKey: createClientIdempotencyKey("avatar-preview")
    });
    setRequestPending(false);

    if (!result.ok) {
      setLocalError(safeUserMessage(result.error, "We couldn’t complete that right now. Please try again."));
      return;
    }

    setPreview(result.data.preview);
    setGeneration(result.data.generation || null);
    setJob(result.data.job || null);
    setAvatarProfile(result.data.avatarProfile || null);
    pollAttemptRef.current = 0;
    if (result.data.preview.status === "ready" && (result.data.preview.imageUrl || result.data.preview.previewUrl)) {
      showToast("Your Virtual Try-On is ready.");
    } else {
      showToast("MyFitPick is preparing your look.");
    }
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

  const displayCopy = editorialLookCopy(outfit);
  const fidelityLevel = preview?.previewFidelityLevel || outfit.preview?.previewFidelityLevel || "partial";
  const fidelityLabel = fidelityLevel === "full" ? "Complete preview" : fidelityLevel === "core_only" ? "Core outfit preview" : "Accessory details may vary";
  const fallbackOmittedCount = presentationItems.filter((item) => recommendationOnlyItemIds.has(item.id)).length;
  const failedMessage = safeTryOnErrorMessage(localError || preview?.errorMessage || generation?.failureMessage || job?.errorMessage || "Virtual Try-On couldn’t be completed.");

  return (
    <div className="min-w-0 space-y-6 pb-[calc(1.5rem+var(--safe-bottom))] lg:pb-8">
      <div className="relative overflow-hidden rounded-xl4 border border-line/80 bg-surface/82 p-6 shadow-card backdrop-blur-xl sm:p-9">
        <div className="absolute right-[-5rem] top-[-6rem] size-60 rounded-full bg-cocoa/10 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cocoa">Preview this look</p>
          <h1 className="mt-2 font-editorial text-4xl font-semibold leading-[0.95] tracking-editorial text-ink sm:text-5xl lg:text-6xl">{displayCopy.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{displayCopy.supportingCopy}</p>
        </div>
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)] lg:items-start">
        <section ref={previewStageRef} tabIndex={-1} className="min-w-0 outline-none">
          <Card className="min-w-0 overflow-hidden p-0">
            {previewState === "completed" && imageUrl ? (
              <div className="transition-opacity duration-200 motion-reduce:transition-none" aria-live="polite">
                <ImageFrame
                  src={imageUrl}
                  alt={`${displayCopy.title} Virtual Try-On preview`}
                  aspect="fullBody"
                  fit="contain"
                  placeholder="Virtual Try-On preview"
                  className="min-w-0 w-full rounded-none border-0 bg-gradient-to-br from-canvas via-surface to-olive/10 p-2 sm:p-4"
                  imageClassName="drop-shadow-[0_24px_48px_rgba(74,46,34,0.14)]"
                />
              </div>
            ) : progressiveCoreReady ? (
              <div className="relative overflow-hidden bg-gradient-to-br from-canvas via-surface to-olive/10" role="status" aria-live="polite">
                <ImageFrame
                  src={imageUrl}
                  alt={`${displayCopy.title} core outfit preview`}
                  aspect="fullBody"
                  fit="contain"
                  placeholder="Core outfit preview"
                  className="min-w-0 w-full rounded-none border-0 bg-transparent p-2 sm:p-4"
                  imageClassName="drop-shadow-[0_24px_48px_rgba(74,46,34,0.14)]"
                />
                <div className="absolute inset-x-3 bottom-3 rounded-3xl border border-cocoa/20 bg-white/92 p-4 text-left shadow-card backdrop-blur-xl sm:inset-x-5 sm:bottom-5 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-success/12 text-success">
                      <CheckCircle2 size={20} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cocoa">Core outfit ready</p>
                      <h2 className="mt-1 text-lg font-semibold text-ink sm:text-xl">Adding selected finishers</h2>
                      <p className="mt-1 text-sm leading-5 text-muted">Your garment preview is usable now. MyFitPick is adding footwear and selected accessories without hiding the result you already have.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : previewState === "failed" ? (
              <div className="flex min-h-[460px] flex-col items-center justify-center bg-gradient-to-br from-danger/5 via-surface to-canvas px-6 py-12 text-center sm:min-h-[560px]" role="alert">
                <span className="grid size-14 place-items-center rounded-full border border-danger/20 bg-danger/10 text-danger">
                  <TriangleAlert size={24} aria-hidden="true" />
                </span>
                <h2 className="mt-6 text-2xl font-semibold text-ink">Virtual Try-On couldn’t be completed</h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-muted">{failedMessage}</p>
                <p className="mt-4 max-w-lg rounded-2xl border border-line bg-white/70 px-4 py-3 text-sm font-semibold text-ink">
                  {creditRestored ? "Your reserved Credit was restored." : "Your Credit status is being checked. You can review your Credits before retrying."}
                </p>
                <div className="mt-7 grid w-full max-w-md gap-2 sm:grid-cols-2">
                  <Button onClick={() => void handleGenerate(true)} disabled={requestPending}>
                    <RotateCcw size={16} aria-hidden="true" />
                    {requestPending ? "Retrying…" : `Retry Try-On · ${regenerateTryOnCreditCost} Credits`}
                  </Button>
                  <Link href={originHref}><Button variant="secondary" className="w-full">{originLabel}</Button></Link>
                </div>
                <Link href="/support" className="focus-ring mt-4 rounded-full px-4 py-2 text-sm font-semibold text-cocoa hover:text-espresso">Contact Support</Link>
              </div>
            ) : previewState === "queued" || previewState === "processing" || previewState === "delayed" ? (
              <div className="relative flex min-h-[460px] flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-white/50 to-canvas/55 px-5 py-12 text-center sm:min-h-[560px] sm:px-10" role="status" aria-live="polite">
                <div className="pointer-events-none absolute size-[22rem] rounded-full bg-cocoa/10 blur-3xl motion-safe:animate-pulse" aria-hidden="true" />
                <div className="relative z-10 flex w-full max-w-2xl flex-col items-center">
                  <span className="relative grid size-16 place-items-center rounded-full border border-cocoa/20 bg-white/80 text-cocoa shadow-glow">
                    <span className="absolute inset-[-0.55rem] rounded-full border border-cocoa/20 motion-safe:animate-pulse" />
                    {previewState === "delayed" ? <Clock3 size={25} aria-hidden="true" /> : <Sparkles size={25} aria-hidden="true" />}
                  </span>
                  <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-cocoa">
                    {previewState === "queued" ? "Queued in MyFitPick Studio" : previewState === "delayed" ? "Still working" : "Studio processing"}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-ink sm:text-3xl">
                    {previewState === "queued" ? "Your look is queued" : previewState === "delayed" ? "Your preview is taking a little longer" : "We’re styling your selected pieces"}
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
                    {previewState === "delayed"
                      ? "Your selected pieces are still being prepared on your Studio Model. You do not need to restart the preview."
                      : "We’re styling your selected pieces on your Studio Model. This can take a little time."}
                  </p>
                  <div className="mt-6 grid w-full gap-3 text-left sm:grid-cols-2">
                    <div className="rounded-2xl border border-line bg-white/70 p-4">
                      <div className="flex items-start gap-3">
                        <BellRing className="mt-0.5 shrink-0 text-cocoa" size={18} aria-hidden="true" />
                        <p className="text-sm leading-6 text-ink">You’ll see a notification in MyFitPick when it is ready.</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-line bg-white/70 p-4">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 shrink-0 text-cocoa" size={18} aria-hidden="true" />
                        <p className="text-sm leading-6 text-ink">You can safely leave this page and return later. Processing will continue.</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Badge tone="info">{presentationItems.length} pieces selected</Badge>
                    {footwearLabel ? <Badge tone="success">Footwear included</Badge> : <Badge tone="warning">Footwear missing</Badge>}
                    {accessoryCount ? <Badge tone="premium">{accessoryCount} {accessoryCount === 1 ? "accessory" : "accessories"} included</Badge> : null}
                    {studioModelReady ? <Badge tone="success">Studio Model ready</Badge> : null}
                  </div>
                  <div className="mt-7 flex max-w-full justify-center -space-x-3" aria-label="Selected pieces">
                    {presentationItems.slice(0, 5).map((item) => (
                      <div key={item.key} className="size-16 overflow-hidden rounded-2xl border-2 border-white bg-canvas shadow-card sm:size-20">
                        <ImageFrame src={item.imageUrl} alt="" aspect="square" fit={item.source === "reference-upload" ? "contain" : "cover"} placeholder={item.category} className="h-full rounded-none border-0" />
                      </div>
                    ))}
                    {presentationItems.length > 5 ? (
                      <div className="grid size-16 place-items-center rounded-2xl border-2 border-white bg-cocoa text-xs font-bold text-canvas shadow-card sm:size-20">+{presentationItems.length - 5}</div>
                    ) : null}
                  </div>
                  {pollWarning ? <p className="mt-5 max-w-lg text-xs leading-5 text-muted">{pollWarning}</p> : null}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[460px] flex-col items-center justify-center bg-gradient-to-br from-canvas/80 via-surface to-cocoa/5 px-6 py-12 text-center sm:min-h-[560px]">
                <span className="grid size-14 place-items-center rounded-full border border-cocoa/20 bg-cocoa/10 text-cocoa"><Layers3 size={23} aria-hidden="true" /></span>
                <h2 className="mt-6 text-2xl font-semibold text-ink">See the complete look on your Studio Model</h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-muted">MyFitPick will prepare one preview using the pieces selected for this outfit.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Badge tone="info">{presentationItems.length} pieces selected</Badge>
                  {footwearLabel ? <Badge tone="success">Footwear included</Badge> : null}
                </div>
                <Button className="mt-7" onClick={() => void handleGenerate(false)} disabled={requestPending}>
                  <Sparkles size={16} aria-hidden="true" />
                  {requestPending ? "Starting…" : `Try this outfit on · ${virtualTryOnCreditCost} Credits`}
                </Button>
                <p className="mt-3 max-w-md text-xs leading-5 text-muted">Credits are charged only after a preview is successfully created.</p>
              </div>
            )}
          </Card>
        </section>

        <aside className="min-w-0 space-y-4">
          <Card className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge tone={outfit.completenessStatus === "complete" ? "success" : "warning"}>{completenessLabel(outfit.completenessStatus)}</Badge>
              {referenceItems.length ? <Badge tone="premium">Photo match</Badge> : null}
              {previewState === "completed" ? <Badge tone="premium">{fidelityLabel}</Badge> : null}
              {progressiveCoreReady ? <Badge tone="success">Core outfit ready</Badge> : null}
              {previewState === "queued" || previewState === "processing" ? <Badge tone="info">Preparing preview</Badge> : null}
              {previewState === "delayed" ? <Badge tone="warning">Taking longer</Badge> : null}
            </div>
            <p className="text-sm leading-6 text-muted">This is a preview, not a perfect fitting.</p>
            {previewState === "completed" && progressStage === "fallback" ? (
              <p className="rounded-2xl border border-warning/25 bg-warning/10 px-3 py-2 text-xs leading-5 text-ink">
                Core preview preserved. {fallbackOmittedCount || "Some"} selected finishing {fallbackOmittedCount === 1 ? "piece was" : "pieces were"} not added by the preview provider.
              </p>
            ) : previewState === "completed" && fidelityLevel !== "full" ? (
              <p className="text-xs leading-5 text-muted">The recommendation still includes every selected piece. Provider rendering of small accessories can vary.</p>
            ) : null}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cocoa">Styled Look</p>
                <p className="mt-1 text-sm font-semibold text-ink">Pieces in this look</p>
              </div>
              <Badge tone="neutral">{presentationItems.length}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
              {presentationItems.map((item) => (
                <article key={item.key} className={item.source === "reference-upload" ? "rounded-2xl border border-cocoa/20 bg-cocoa/10 p-2" : "rounded-2xl border border-line bg-canvas/60 p-2"}>
                  <button
                    type="button"
                    className="focus-ring block w-full rounded-2xl text-left"
                    onClick={() => {
                      if (!item.imageUrl) return;
                      setViewingImage({ src: item.imageUrl, alt: item.name, title: item.name, subtitle: [item.color, item.category].filter(Boolean).join(" · ") });
                    }}
                    aria-label={`View ${item.name}`}
                  >
                    <ImageFrame src={item.imageUrl} alt={item.name} aspect="square" fit={item.source === "reference-upload" ? "contain" : "cover"} placeholder={item.category} className="mb-2" />
                  </button>
                  {item.source === "reference-upload" ? <Badge tone="premium">Uploaded item</Badge> : null}
                  {providerCompletedItemIds.has(item.id) ? <Badge tone="success">Provider pass complete</Badge> : null}
                  {pendingItemIds.has(item.id) ? <Badge tone="info">Selected — finishing</Badge> : null}
                  {previewState === "completed" && recommendationOnlyItemIds.has(item.id) ? <Badge tone="warning">Selected — not rendered</Badge> : null}
                  <p className="line-clamp-2 text-xs font-semibold leading-4 text-ink">{item.name}</p>
                  <p className="mt-1 truncate text-[11px] text-muted">{[item.color, item.category].filter(Boolean).join(" · ")}</p>
                </article>
              ))}
            </div>
          </Card>

          {footwearLabel ? (
            <Card className="space-y-2 border-success/20 bg-success/10">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink"><CheckCircle2 size={16} className="text-success" aria-hidden="true" />Footwear included</p>
              <p className="text-sm leading-6 text-muted">{footwearLabel}</p>
            </Card>
          ) : (
            <Card className="space-y-3 border-warning/25 bg-warning/10">
              <p className="text-sm font-semibold text-ink">Shoes are missing</p>
              <p className="text-sm leading-6 text-ink">Add shoes for a complete outfit.</p>
            </Card>
          )}

          <Card className="space-y-3">
            {previewState === "completed" ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <Button onClick={() => void handleSave()}>Save Look</Button>
                <PreviewDownloadButton outfitId={outfit.id} />
                <Button variant="secondary" onClick={() => void handleGenerate(true)} disabled={requestPending}>
                  <RotateCcw size={16} aria-hidden="true" />
                  {requestPending ? "Regenerating…" : `Regenerate Preview · ${regenerateTryOnCreditCost} Credits`}
                </Button>
              </div>
            ) : null}
            {shouldPollTryOnPreview(previewState) ? (
              <div className="space-y-3">
                <Link href={originHref}><Button variant="secondary" className="w-full">{originLabel}</Button></Link>
                <p className="text-center text-xs leading-5 text-muted">Your preview will continue processing in MyFitPick.</p>
              </div>
            ) : null}
            {previewState === "idle" ? <Link href={originHref}><Button variant="ghost" className="w-full">{originLabel}</Button></Link> : null}
          </Card>
        </aside>
      </div>
      <ImagePreviewDialog image={viewingImage} onClose={() => setViewingImage(null)} />
      <Toast show={Boolean(toast)} message={toast} />
    </div>
  );
}
