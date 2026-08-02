export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/admin";
import { logSafeError } from "@/lib/security/safe-log";
import { StudioModelAsset, studioModelAssetStatuses } from "@/models/StudioModelAsset";
import { canTransitionAssetStatus } from "@/lib/studio-model/catalog/asset-status";
import { readJson, validateBody } from "@/lib/validation";

const patchSchema = z.object({ appearanceKey: z.string().trim().min(4).max(40), version: z.string().trim().min(1).max(40).default("v1"), action: z.enum(["mark_ready", "mark_failed", "reject", "requeue", "replace", "deprecate"]), assetUrl: z.string().url().startsWith("https://").max(2048).optional(), storageKey: z.string().trim().max(512).optional(), thumbnailUrl: z.string().url().startsWith("https://").max(2048).optional() }).strict();

function serialize(asset: any) {
  return { id: String(asset._id), appearanceKey: asset.appearanceKey, assetUrl: asset.assetUrl, thumbnailUrl: asset.thumbnailUrl, genderPresentation: asset.genderPresentation, bodyType: asset.bodyType, skinTone: asset.skinTone, undertone: asset.undertone, hairTexture: asset.hairTexture, hairLength: asset.hairLength, hairStyle: asset.hairStyle, hairColor: asset.hairColor, heightGroup: asset.heightGroup, version: asset.version, status: asset.status, sourceType: asset.sourceType, qualityScore: asset.qualityScore, validationVersion: asset.validationVersion, generationPromptVersion: asset.generationPromptVersion, reviewedAt: asset.reviewedAt, createdAt: asset.createdAt, updatedAt: asset.updatedAt };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(); if (!auth.ok) return auth.response;
    const params = request.nextUrl.searchParams, query: Record<string, unknown> = {};
    for (const key of ["appearanceKey", "status", "genderPresentation", "bodyType", "skinTone", "hairTexture", "hairStyle", "provider", "sourceType", "version"]) { const value = String(params.get(key) || "").trim(); if (value) query[key] = value; }
    const assets = await StudioModelAsset.find(query).sort({ updatedAt: -1 }).limit(Math.min(100, Math.max(1, Number(params.get("limit") || 50)))).lean();
    return apiSuccess({ assets: assets.map(serialize) });
  } catch (error) { logSafeError("admin.studio-model-assets.get", error); return apiError("INTERNAL_ERROR", "Unable to load Studio Model assets."); }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(); if (!auth.ok) return auth.response;
    const parsed = validateBody(patchSchema, await readJson(request)); if (!parsed.ok) return parsed.response;
    const asset = await StudioModelAsset.findOne({ appearanceKey: parsed.data.appearanceKey, version: parsed.data.version });
    if (!asset) return apiError("NOT_FOUND", "Studio Model asset not found.");
    const target = parsed.data.action === "mark_ready" || parsed.data.action === "replace" ? "READY" : parsed.data.action === "mark_failed" || parsed.data.action === "reject" ? "FAILED" : parsed.data.action === "requeue" ? "MISSING" : asset.status;
    if (parsed.data.action !== "deprecate" && !canTransitionAssetStatus(asset.status as any, target as any)) return apiError("VALIDATION_ERROR", "That asset status transition is not allowed.");
    if ((parsed.data.action === "mark_ready" || parsed.data.action === "replace") && !(parsed.data.assetUrl || asset.assetUrl)) return apiError("VALIDATION_ERROR", "A secure asset URL is required.");
    asset.status = target as any; asset.reviewedAt = new Date();
    if (parsed.data.assetUrl) asset.assetUrl = parsed.data.assetUrl;
    if (parsed.data.storageKey) asset.storageKey = parsed.data.storageKey;
    if (parsed.data.thumbnailUrl) asset.thumbnailUrl = parsed.data.thumbnailUrl;
    if (parsed.data.action === "deprecate") asset.deprecatedAt = new Date();
    await asset.save(); return apiSuccess({ asset: serialize(asset) });
  } catch (error) { logSafeError("admin.studio-model-assets.patch", error); return apiError("INTERNAL_ERROR", "Unable to update Studio Model asset."); }
}
