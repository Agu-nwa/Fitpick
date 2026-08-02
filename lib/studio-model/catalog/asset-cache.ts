import { StudioModelAsset } from "@/models/StudioModelAsset";
export async function getCachedStudioModelAsset(appearanceKey: string, version: string) {
  return StudioModelAsset.findOne({ appearanceKey, version, status: "READY", deprecatedAt: null }).lean();
}
