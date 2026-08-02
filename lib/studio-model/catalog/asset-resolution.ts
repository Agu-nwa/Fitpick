import type { StudioModelAppearance } from "../appearance-taxonomy";
import { studioModelAppearanceKey } from "../configuration";
import { findStudioModelCatalogAsset, findStudioModelFallback, ensureStudioModelAssetRecord } from "./asset-catalog";
import { STUDIO_MODEL_CATALOG_VERSION } from "./asset-version";
import { enqueueJob, backgroundJobsEnabled } from "@/lib/jobs/queue";

export async function resolveStudioModelCatalog(appearance: StudioModelAppearance, options: { userId?: string; enqueueMissing?: boolean; version?: string } = {}) {
  const version = options.version || STUDIO_MODEL_CATALOG_VERSION;
  const appearanceKey = studioModelAppearanceKey(appearance);
  const exact = await findStudioModelCatalogAsset(appearance, version);
  if (exact) return { asset: exact, fallback: null, appearanceKey, status: "READY" as const, generationQueued: false };
  const record = await ensureStudioModelAssetRecord(appearance, version);
  let generationQueued = false;
  if (options.enqueueMissing !== false && options.userId && backgroundJobsEnabled() && record.status !== "GENERATING") {
    const claimed = await StudioModelAssetClaimForQueue(appearanceKey, version);
    if (claimed) {
      try {
        await enqueueJob("studio_model_asset_generation", { appearanceKey, version }, { userId: options.userId, maxAttempts: 3 });
        generationQueued = true;
      } catch (error) {
        const { StudioModelAsset } = await import("@/models/StudioModelAsset");
        await StudioModelAsset.updateOne({ appearanceKey, version, status: "GENERATING" }, { $set: { status: "MISSING", failureCode: "queue_failed" } });
        throw error;
      }
    }
  }
  const fallback = await findStudioModelFallback(appearance, version);
  return { asset: null, fallback, appearanceKey, status: record.status as any, generationQueued };
}

async function StudioModelAssetClaimForQueue(appearanceKey: string, version: string) {
  const { StudioModelAsset } = await import("@/models/StudioModelAsset");
  return StudioModelAsset.findOneAndUpdate({ appearanceKey, version, status: { $in: ["MISSING", "FAILED", "FALLBACK"] } }, { $set: { status: "GENERATING", failureCode: "" } }, { new: true });
}
