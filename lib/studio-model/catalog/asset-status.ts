import { studioModelAssetStatuses } from "@/models/StudioModelAsset";
export type StudioModelAssetStatus = typeof studioModelAssetStatuses[number];
const transitions: Record<StudioModelAssetStatus, StudioModelAssetStatus[]> = {
  MISSING: ["GENERATING", "FALLBACK", "FAILED"], GENERATING: ["READY", "FAILED", "REVIEW_REQUIRED"],
  FAILED: ["MISSING", "GENERATING", "FALLBACK"], REVIEW_REQUIRED: ["MISSING", "READY", "FAILED", "GENERATING"],
  FALLBACK: ["GENERATING", "READY"], READY: ["REVIEW_REQUIRED", "FAILED"]
};
export function canTransitionAssetStatus(from: StudioModelAssetStatus, to: StudioModelAssetStatus) { return from === to || transitions[from].includes(to); }
