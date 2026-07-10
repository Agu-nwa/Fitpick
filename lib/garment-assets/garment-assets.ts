import type { Types } from "mongoose";
import { GarmentAsset } from "@/models/GarmentAsset";
import { WardrobeItem } from "@/models/WardrobeItem";

type GarmentAssetCandidate = {
  assetType: "texture_reference" | "flat_lay";
  sourceImageVariant: "original" | "fabric" | "label";
  storageKey: string;
  imageUrl: string;
  textureStorageKey?: string;
  accuracyLevel: "garment_referenced" | "fit_locked";
};

function variant(image: any) {
  return {
    storageKey: image?.variants?.original?.storageKey || image?.storageKey || "",
    url: image?.variants?.original?.url || image?.url || ""
  };
}

function firstUsable(candidates: Array<{ sourceImageVariant: GarmentAssetCandidate["sourceImageVariant"]; storageKey: string; imageUrl: string }>) {
  return candidates.find((candidate) => candidate.storageKey || candidate.imageUrl) || null;
}

function buildAssetCandidates(item: any): GarmentAssetCandidate[] {
  const images = item?.images || {};
  const front = images.front || {};
  const back = images.back || {};
  const fabric = images.fabricCloseUp || {};
  const fitLocked = item?.garmentFit && item.garmentFit !== "unknown" && item?.taggedSize && item.taggedSize !== "unknown";

  const flatLay = firstUsable([
    { sourceImageVariant: "original", storageKey: variant(front).storageKey, imageUrl: variant(front).url },
    { sourceImageVariant: "original", storageKey: variant(back).storageKey, imageUrl: variant(back).url }
  ]);
  const texture = firstUsable([
    { sourceImageVariant: "fabric", storageKey: variant(fabric).storageKey, imageUrl: variant(fabric).url },
    { sourceImageVariant: "original", storageKey: variant(front).storageKey, imageUrl: variant(front).url }
  ]);

  return [
    flatLay ? { assetType: "flat_lay", ...flatLay, accuracyLevel: fitLocked ? "fit_locked" : "garment_referenced" } : null,
    texture ? { assetType: "texture_reference", ...texture, textureStorageKey: texture.storageKey, accuracyLevel: "garment_referenced" } : null
  ].filter(Boolean) as GarmentAssetCandidate[];
}

export async function createGarmentAssetFromWardrobeItem(item: any) {
  const itemObject = item?.toObject?.() ?? item;
  const candidates = buildAssetCandidates(itemObject);
  const assets = [];

  for (const candidate of candidates) {
    const asset = await GarmentAsset.findOneAndUpdate(
      {
        userId: itemObject.userId,
        wardrobeItemId: itemObject._id,
        assetType: candidate.assetType,
        sourceImageVariant: candidate.sourceImageVariant
      },
      {
        $set: {
          userId: itemObject.userId,
          wardrobeItemId: itemObject._id,
          assetType: candidate.assetType,
          sourceImageVariant: candidate.sourceImageVariant,
          storageKey: candidate.storageKey,
          imageUrl: candidate.imageUrl,
          textureStorageKey: candidate.textureStorageKey || "",
          measurements: itemObject.garmentMeasurements || {},
          simulationProvider: "none",
          simulationStatus: "not_ready",
          accuracyLevel: candidate.accuracyLevel
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    assets.push(asset);
  }

  return assets;
}

export async function createGarmentAssetsForItemId(userId: string | Types.ObjectId, wardrobeItemId: string | Types.ObjectId) {
  const item = await WardrobeItem.findOne({ _id: wardrobeItemId, userId, archivedAt: null });
  if (!item) throw new Error("Wardrobe item was not found.");
  return createGarmentAssetFromWardrobeItem(item);
}

export async function getGarmentAssetsForOutfit(userId: string | Types.ObjectId, itemIds: Array<string | Types.ObjectId>) {
  return GarmentAsset.find({
    userId,
    wardrobeItemId: { $in: itemIds }
  }).lean();
}

export async function markGarmentAssetSimulationReady(input: {
  userId: string | Types.ObjectId;
  garmentAssetId: string | Types.ObjectId;
  meshStorageKey?: string;
  textureStorageKey?: string;
  simulationProvider?: "internal" | "clo" | "browzwear" | "pictofit" | "custom" | "none";
}) {
  return GarmentAsset.findOneAndUpdate(
    { _id: input.garmentAssetId, userId: input.userId },
    {
      $set: {
        meshStorageKey: input.meshStorageKey || "",
        textureStorageKey: input.textureStorageKey || "",
        simulationProvider: input.simulationProvider || "custom",
        simulationStatus: "ready",
        accuracyLevel: "true_3d_simulation"
      }
    },
    { new: true }
  );
}

export function serializeGarmentAsset(asset: any) {
  return {
    id: asset?._id ? String(asset._id) : "",
    userId: asset?.userId ? String(asset.userId) : "",
    wardrobeItemId: asset?.wardrobeItemId ? String(asset.wardrobeItemId) : "",
    assetType: asset?.assetType || "flat_lay",
    sourceImageVariant: asset?.sourceImageVariant || "original",
    storageKey: asset?.storageKey || "",
    imageUrl: asset?.imageUrl || "",
    meshStorageKey: asset?.meshStorageKey || "",
    textureStorageKey: asset?.textureStorageKey || "",
    measurements: asset?.measurements || {},
    simulationProvider: asset?.simulationProvider || "none",
    simulationStatus: asset?.simulationStatus || "not_ready",
    accuracyLevel: asset?.accuracyLevel || "garment_referenced",
    createdAt: asset?.createdAt ? new Date(asset.createdAt).toISOString() : null,
    updatedAt: asset?.updatedAt ? new Date(asset.updatedAt).toISOString() : null
  };
}
