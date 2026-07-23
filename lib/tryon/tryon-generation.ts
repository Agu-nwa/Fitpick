import crypto from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import type { Types } from "mongoose";
import { errorCategory } from "@/lib/ai/observability/ai-logger";
import { type CreditFeature, getCreditCost } from "@/lib/credits/credit-costs";
import {
  commitReservedCredits,
  refundCommittedCredits,
  releaseCreditReservation,
  reserveCreditsForFeature,
  type InsufficientCreditsError
} from "@/lib/credits/credit-engine";
import { assertUsablePreviewRecord } from "@/lib/tryon/tryon-image-validation";
import { AvatarOutfitPreview } from "@/models/AvatarOutfitPreview";
import { TryOnGeneration, type TryOnGenerationDocument } from "@/models/TryOnGeneration";

export const activeTryOnGenerationStatuses = [
  "requested",
  "validating",
  "queued",
  "reserved",
  "submitting",
  "processing",
  "provider_completed",
  "downloading",
  "uploading",
  "saving"
] as const;

type TryOnGenerationStatus = typeof activeTryOnGenerationStatuses[number] | "completed" | "failed" | "cancelled" | "expired";

type GenerationInput = {
  userId: string | Types.ObjectId;
  outfitId: string | Types.ObjectId;
  avatarProfileId: string | Types.ObjectId;
  cacheKey: string;
  creditFeature: CreditFeature;
  idempotencyKey: string;
  provider: string;
  metadata?: Record<string, unknown>;
};

function sanitizeTryOnMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return {};
  return JSON.parse(JSON.stringify(metadata, (key, value) => {
    if (/secret|token|key|password|base64|b64|signed|authorization/i.test(key)) return undefined;
    if (typeof value === "string" && value.length > 240) return value.slice(0, 240);
    return value;
  }));
}

function nowIso() {
  return new Date().toISOString();
}

export function isActiveTryOnGenerationStatus(status?: string) {
  return activeTryOnGenerationStatuses.includes(status as any);
}

export function createTryOnIdempotencyKey(input: {
  source: string;
  userId: string;
  outfitId: string;
  cacheKey: string;
  regenerate?: boolean;
  clientKey?: string | null;
}) {
  const clientKey = String(input.clientKey || "").trim().slice(0, 120);
  if (clientKey) return `${input.source}:${input.userId}:${clientKey}`.slice(0, 180);
  if (!input.regenerate) return `${input.source}:${input.outfitId}:${input.cacheKey}`.slice(0, 180);
  return `${input.source}:${input.outfitId}:${input.cacheKey}:regen:${crypto.randomUUID()}`.slice(0, 180);
}

export function tryOnCreditReferenceId(generationId: string) {
  return `tryon-generation:${generationId}`.slice(0, 160);
}

export function safeTryOnFailureMessage(error: unknown) {
  if (error && typeof error === "object" && "name" in error && String((error as { name?: unknown }).name) === "InsufficientCreditsError") {
    return "You need more Credits before this try-on can be completed.";
  }
  if (error instanceof Error && /provider|FASHN|OpenAI|try-on/i.test(error.message)) return "The AI provider could not complete this try-on.";
  if (error instanceof Error && /S3|storage|upload|image/i.test(error.message)) return "The generated image could not be safely saved.";
  return "Virtual Try-On could not be completed. Your credit was not deducted.";
}

export function serializeTryOnGeneration(generation: any) {
  if (!generation) return null;
  return {
    generationId: generation.generationId || "",
    idempotencyKey: generation.idempotencyKey || "",
    outfitId: generation.outfitId ? String(generation.outfitId) : "",
    avatarProfileId: generation.avatarProfileId ? String(generation.avatarProfileId) : "",
    previewId: generation.previewId ? String(generation.previewId) : null,
    provider: generation.provider || "",
    providerJobId: generation.providerJobId || "",
    status: generation.status || "requested",
    failureStage: generation.failureStage || "",
    failureCode: generation.failureCode || "",
    failureMessage: generation.failureMessage || "",
    previewUrl: generation.previewUrl || "",
    storageKey: generation.storageKey || "",
    creditsReserved: Number(generation.creditsReserved || 0),
    creditsCommitted: Number(generation.creditsCommitted || 0),
    creditsReleased: Number(generation.creditsReleased || 0),
    retryCount: Number(generation.retryCount || 0),
    durationMs: Number(generation.durationMs || 0),
    startedAt: generation.startedAt ? new Date(generation.startedAt).toISOString() : null,
    completedAt: generation.completedAt ? new Date(generation.completedAt).toISOString() : null,
    updatedAt: generation.updatedAt ? new Date(generation.updatedAt).toISOString() : null
  };
}

export function logTryOnGenerationEvent(event: {
  event: string;
  generationId?: string;
  userId?: string;
  outfitId?: string;
  provider?: string;
  providerJobId?: string;
  stage?: string;
  durationMs?: number;
  retryCount?: number;
  errorCode?: string;
  httpStatus?: number;
}) {
  const payload = {
    event: event.event,
    generationId: event.generationId || "",
    userId: event.userId || "",
    outfitId: event.outfitId || "",
    provider: event.provider || "",
    providerJobId: event.providerJobId || "",
    stage: event.stage || "",
    durationMs: event.durationMs || 0,
    retryCount: event.retryCount || 0,
    errorCode: event.errorCode || "",
    httpStatus: event.httpStatus || 0,
    timestamp: nowIso()
  };
  console.info("fitpick.tryon", payload);
  Sentry.addBreadcrumb({
    category: "tryon.generation",
    message: event.event,
    level: event.event.includes("failed") ? "error" : "info",
    data: payload
  });
}

export function findActiveTryOnGeneration(input: {
  userId: string | Types.ObjectId;
  outfitId: string | Types.ObjectId;
  cacheKey: string;
  creditFeature: CreditFeature;
}) {
  return TryOnGeneration.findOne({
    userId: input.userId,
    outfitId: input.outfitId,
    cacheKey: input.cacheKey,
    creditFeature: input.creditFeature,
    status: { $in: activeTryOnGenerationStatuses }
  }).sort({ createdAt: -1 });
}

export async function getOrCreateTryOnGeneration(input: GenerationInput) {
  const existing = await TryOnGeneration.findOne({ userId: input.userId, idempotencyKey: input.idempotencyKey });
  if (existing) return { generation: existing, reused: true };

  const generationId = crypto.randomUUID();
  const creditReferenceId = tryOnCreditReferenceId(generationId);
  try {
    const generation = await TryOnGeneration.create({
      generationId,
      idempotencyKey: input.idempotencyKey,
      userId: input.userId,
      outfitId: input.outfitId,
      avatarProfileId: input.avatarProfileId,
      cacheKey: input.cacheKey,
      creditFeature: input.creditFeature,
      creditReferenceId,
      provider: input.provider,
      status: "requested",
      startedAt: new Date(),
      stageTimestamps: { requested: nowIso() },
      metadata: sanitizeTryOnMetadata(input.metadata)
    });
    logTryOnGenerationEvent({ event: "tryon_requested", generationId, userId: String(input.userId), outfitId: String(input.outfitId), provider: input.provider, stage: "requested" });
    return { generation, reused: false };
  } catch (error: any) {
    if (error?.code === 11000) {
      const generation = await TryOnGeneration.findOne({ userId: input.userId, idempotencyKey: input.idempotencyKey });
      if (generation) return { generation, reused: true };
    }
    throw error;
  }
}

export async function markTryOnGenerationStage(generationId: string, status: TryOnGenerationStatus, patch: Record<string, unknown> = {}) {
  const generation = await TryOnGeneration.findOne({ generationId });
  if (!generation) return null;
  const now = new Date();
  const startedAt = generation.startedAt ? new Date(generation.startedAt).getTime() : now.getTime();
  const set: Record<string, unknown> = {
    ...patch,
    status,
    [`stageTimestamps.${status}`]: now.toISOString()
  };
  if (status === "completed") {
    set.completedAt = now;
    set.durationMs = Math.max(0, now.getTime() - startedAt);
  }
  if (status === "failed") {
    set.failedAt = now;
    set.durationMs = Math.max(0, now.getTime() - startedAt);
  }
  if (status === "cancelled") set.cancelledAt = now;
  if (status === "expired") set.expiredAt = now;

  const updated = await TryOnGeneration.findOneAndUpdate({ generationId }, { $set: set }, { new: true });
  if (updated) {
    logTryOnGenerationEvent({
      event: status === "completed" ? "tryon_completed" : status === "failed" ? "tryon_failed" : `tryon_${status}`,
      generationId,
      userId: String(updated.userId),
      outfitId: String(updated.outfitId),
      provider: updated.provider,
      providerJobId: updated.providerJobId,
      stage: status,
      durationMs: Number(updated.durationMs || 0),
      retryCount: Number(updated.retryCount || 0),
      errorCode: updated.failureCode || ""
    });
  }
  return updated;
}

export async function reserveTryOnGenerationCredits(generation: TryOnGenerationDocument | any) {
  const feature = generation.creditFeature as CreditFeature;
  const result = await reserveCreditsForFeature({
    userId: generation.userId,
    feature,
    referenceId: generation.creditReferenceId,
    metadata: {
      generationId: generation.generationId,
      outfitId: String(generation.outfitId),
      source: generation.metadata?.source || "virtual_try_on"
    }
  });
  const creditsReserved = result.alreadyCommitted ? 0 : getCreditCost(feature);
  const updated = await markTryOnGenerationStage(generation.generationId, "reserved", { creditsReserved });
  logTryOnGenerationEvent({ event: "credit_reserved", generationId: generation.generationId, userId: String(generation.userId), outfitId: String(generation.outfitId), provider: generation.provider, stage: "reserved" });
  return { ...result, generation: updated || generation };
}

export async function releaseTryOnGenerationCredits(generation: TryOnGenerationDocument | any, reason = "generation_failed") {
  if (!generation || generation.creditsCommitted) return null;
  const feature = generation.creditFeature as CreditFeature;
  const released = await releaseCreditReservation({
    userId: generation.userId,
    feature,
    referenceId: generation.creditReferenceId,
    reason,
    metadata: { generationId: generation.generationId, outfitId: String(generation.outfitId) }
  });
  const creditsReleased = released.released ? getCreditCost(feature) : Number(generation.creditsReleased || 0);
  await TryOnGeneration.findOneAndUpdate({ generationId: generation.generationId }, { $set: { creditsReleased } });
  if (released.released) {
    logTryOnGenerationEvent({ event: "credit_released", generationId: generation.generationId, userId: String(generation.userId), outfitId: String(generation.outfitId), provider: generation.provider, stage: "released" });
  }
  return released;
}

export async function commitTryOnGenerationCredits(input: {
  generation: TryOnGenerationDocument | any;
  preview: any;
  metadata?: Record<string, unknown>;
}) {
  const generation = input.generation;
  const preview = input.preview?.toObject?.() ?? input.preview;
  if (!assertUsablePreviewRecord(preview)) throw new Error("tryon_preview_not_usable_for_billing");

  const readBack = await AvatarOutfitPreview.findOne({
    _id: preview._id,
    userId: generation.userId,
    outfitId: generation.outfitId,
    status: "ready",
    imageUrl: { $ne: "" },
    storageKey: { $ne: "" }
  }).lean();
  if (!assertUsablePreviewRecord(readBack)) throw new Error("tryon_preview_readback_failed");

  await markTryOnGenerationStage(generation.generationId, "saving", {
    previewId: readBack?._id,
    previewUrl: readBack?.imageUrl || "",
    storageKey: readBack?.storageKey || ""
  });
  const charge = await commitReservedCredits({
    userId: generation.userId,
    feature: generation.creditFeature as CreditFeature,
    referenceId: generation.creditReferenceId,
    metadata: {
      ...input.metadata,
      generationId: generation.generationId,
      outfitId: String(generation.outfitId),
      previewId: String(readBack?._id || "")
    }
  });
  const creditsCommitted = charge.transaction.status === "spent" ? Number(charge.transaction.credits || getCreditCost(generation.creditFeature as CreditFeature)) : 0;
  const completed = await markTryOnGenerationStage(generation.generationId, "completed", {
    previewId: readBack?._id,
    previewUrl: readBack?.imageUrl || "",
    storageKey: readBack?.storageKey || "",
    creditsCommitted,
    failureStage: "",
    failureCode: "",
    failureMessage: ""
  });
  logTryOnGenerationEvent({ event: "credit_committed", generationId: generation.generationId, userId: String(generation.userId), outfitId: String(generation.outfitId), provider: generation.provider, stage: "completed" });
  return { creditCharge: charge, generation: completed || generation, preview: readBack };
}

export async function failTryOnGeneration(input: {
  generation: TryOnGenerationDocument | any;
  stage: string;
  code?: string;
  error?: unknown;
  message?: string;
}) {
  const generation = input.generation;
  if (!generation) return null;
  if (generation.creditsCommitted) {
    await refundTryOnGenerationIfCharged({ generation, reason: input.code || "generation_failed_after_commit" });
  } else {
    await releaseTryOnGenerationCredits(generation, input.code || "generation_failed");
  }
  const failureMessage = input.message || safeTryOnFailureMessage(input.error);
  const updated = await markTryOnGenerationStage(generation.generationId, "failed", {
    failureStage: input.stage,
    failureCode: input.code || errorCategory(input.error),
    failureMessage,
    providerDiagnostics: sanitizeTryOnMetadata({ errorCategory: errorCategory(input.error) })
  });
  if (input.error) {
    Sentry.captureException(input.error instanceof Error ? input.error : new Error(String(input.error)), {
      tags: { area: "tryon_generation", stage: input.stage, generationId: generation.generationId },
      extra: { generationId: generation.generationId, provider: generation.provider, code: input.code || errorCategory(input.error) }
    });
  }
  return updated;
}

export async function refundTryOnGenerationIfCharged(input: {
  generation: TryOnGenerationDocument | any;
  reason?: string;
}) {
  const generation = input.generation;
  if (!generation?.creditsCommitted) return null;
  const refunded = await refundCommittedCredits({
    userId: generation.userId,
    feature: generation.creditFeature as CreditFeature,
    referenceId: generation.creditReferenceId,
    reason: input.reason || "tryon_preview_missing_after_commit",
    metadata: { generationId: generation.generationId, outfitId: String(generation.outfitId) }
  });
  if (refunded.refunded) {
    logTryOnGenerationEvent({ event: "credit_refunded", generationId: generation.generationId, userId: String(generation.userId), outfitId: String(generation.outfitId), provider: generation.provider, stage: "refund" });
  }
  return refunded;
}

export async function expireStaleTryOnGenerations(input: { olderThanMs?: number; limit?: number } = {}) {
  const olderThanMs = Math.max(5 * 60_000, input.olderThanMs || 45 * 60_000);
  const limit = Math.max(1, Math.min(input.limit || 100, 500));
  const cutoff = new Date(Date.now() - olderThanMs);
  const stale = await TryOnGeneration.find({
    status: { $in: activeTryOnGenerationStatuses },
    updatedAt: { $lte: cutoff }
  }).sort({ updatedAt: 1 }).limit(limit);

  const expired: string[] = [];
  for (const generation of stale) {
    await releaseTryOnGenerationCredits(generation, "stale_generation_expired");
    await markTryOnGenerationStage(generation.generationId, "expired", {
      failureStage: "stale_cleanup",
      failureCode: "expired",
      failureMessage: "Try-on generation expired before completion."
    });
    expired.push(generation.generationId);
  }
  return { expiredCount: expired.length, generationIds: expired };
}

export function isInsufficientCreditsError(error: unknown): error is InsufficientCreditsError {
  return Boolean(error && typeof error === "object" && "name" in error && String((error as { name?: unknown }).name) === "InsufficientCreditsError");
}
