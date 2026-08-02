import sharp from "sharp";
import { uploadGeneratedImage } from "@/lib/storage/generated-images";
import { studioModelAssetHash } from "./asset-hash";
export async function storeStudioModelAsset(body: Buffer, appearanceKey: string, version: string) {
  const hash = studioModelAssetHash(body);
  const basePrefix = process.env.STUDIO_MODEL_INTEGRATION_TEST_ENABLED === "true" ? String(process.env.STUDIO_MODEL_INTEGRATION_TEST_PREFIX || "") : "studio-model-assets/";
  const prefix = basePrefix.replace(/^\/+|\/+$/g, "");
  const original = await uploadGeneratedImage(body, { userId: "catalog", outfitId: version, cacheKey: appearanceKey, storageKey: `${prefix}/${version}/${appearanceKey}/${hash}.png`, contentType: "image/png", format: "png", width: 1024, height: 1536 });
  const thumbnailBody = await sharp(body).resize({ width: 320, height: 480, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const thumbnail = await uploadGeneratedImage(thumbnailBody, { userId: "catalog", outfitId: version, cacheKey: `${appearanceKey}:thumbnail`, storageKey: `${prefix}/${version}/${appearanceKey}/${hash}-thumbnail.webp`, contentType: "image/webp", format: "webp", width: 320, height: 480 });
  if (original.storageKey === thumbnail.storageKey || original.bytes < 20_000 || thumbnail.bytes < 1_000) throw new Error("thumbnail_failed");
  return { hash, assetUrl: original.url, storageKey: original.storageKey, thumbnailUrl: thumbnail.url, thumbnailStorageKey: thumbnail.storageKey, thumbnailWidth: thumbnail.width, thumbnailHeight: thumbnail.height, thumbnailBytes: thumbnail.bytes, thumbnailFormat: thumbnail.format };
}
