import type { OutfitRecommendation } from "@/types/outfit";

export type TryOnPreviewUiState = "idle" | "queued" | "processing" | "delayed" | "completed" | "failed";
export type TryOnOrigin = "create_look" | "match" | "stylist_chat" | "stylist";

export const TRYON_DELAYED_AFTER_MS = 2 * 60 * 1000;

const queuedGenerationStatuses = new Set(["requested", "validating", "reserved", "queued"]);
const processingGenerationStatuses = new Set([
  "submitting",
  "processing",
  "provider_completed",
  "downloading",
  "uploading",
  "saving"
]);
const failedGenerationStatuses = new Set(["failed", "cancelled", "expired"]);
const failedJobStatuses = new Set(["failed", "cancelled", "dead_letter"]);

type PreviewStatusInput = {
  preview?: { status?: string; billingStatus?: string; generatedAt?: string | null; updatedAt?: string | null } | null;
  generation?: {
    status?: string;
    creditsReleased?: number;
    startedAt?: string | null;
    updatedAt?: string | null;
  } | null;
  job?: { status?: string; createdAt?: string | null; startedAt?: string | null; updatedAt?: string | null } | null;
  imageUrl?: string | null;
  requestPending?: boolean;
  localFailure?: boolean;
  now?: number;
};

function timestampMs(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!value) continue;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export function deriveTryOnPreviewUiState(input: PreviewStatusInput): TryOnPreviewUiState {
  const previewStatus = input.preview?.status || "not_started";
  const generationStatus = input.generation?.status || "";
  const jobStatus = input.job?.status || "";

  if ((previewStatus === "ready" || generationStatus === "completed") && input.imageUrl) return "completed";
  if (input.localFailure || previewStatus === "failed" || failedGenerationStatuses.has(generationStatus) || failedJobStatuses.has(jobStatus)) return "failed";

  const queued = jobStatus === "queued" || queuedGenerationStatuses.has(generationStatus);
  const activelyProcessing = input.requestPending
    || jobStatus === "processing"
    || jobStatus === "completed"
    || processingGenerationStatuses.has(generationStatus)
    || generationStatus === "completed";
  const processing = activelyProcessing || (!queued && previewStatus === "generating");

  if (!queued && !processing) return "idle";

  const startedAt = timestampMs(
    input.generation?.startedAt,
    input.job?.createdAt,
    input.job?.startedAt,
    input.generation?.updatedAt,
    input.job?.updatedAt,
    input.preview?.generatedAt,
    input.preview?.updatedAt
  );
  if (startedAt && (input.now ?? Date.now()) - startedAt >= TRYON_DELAYED_AFTER_MS) return "delayed";
  return queued && !activelyProcessing ? "queued" : "processing";
}

export function shouldPollTryOnPreview(state: TryOnPreviewUiState) {
  return state === "queued" || state === "processing" || state === "delayed";
}

export function creditRestorationConfirmed(input: PreviewStatusInput) {
  return Number(input.generation?.creditsReleased || 0) > 0
    || input.preview?.billingStatus === "released"
    || input.preview?.billingStatus === "refunded";
}

export function resolveTryOnOrigin(value: string | null | undefined, outfit?: OutfitRecommendation | null): TryOnOrigin {
  if (value === "create_look" || value === "match" || value === "stylist_chat" || value === "stylist") return value;
  const recommendationMode = String(outfit?.recommendationMode || "").toLowerCase();
  if (outfit?.referenceItems?.length || outfit?.referenceItemIds?.length || /match|reference|photo/.test(recommendationMode)) return "match";
  if (outfit?.source === "stylist_chat") return "stylist_chat";
  return "stylist";
}

export function tryOnOriginDestination(origin: TryOnOrigin) {
  if (origin === "create_look") return "/stylist/create-look";
  if (origin === "match") return "/stylist/match";
  return "/stylist";
}

export function tryOnOriginLabel(origin: TryOnOrigin) {
  if (origin === "create_look") return "Back to Create a Look";
  if (origin === "match") return "Back to Match an Outfit";
  return "Back to Stylist";
}
