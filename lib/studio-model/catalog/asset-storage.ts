import sharp from "sharp";
import { uploadGeneratedImage } from "@/lib/storage/generated-images";
import { studioModelAssetHash } from "./asset-hash";
export async function storeStudioModelAsset(body: Buffer, appearanceKey: string, version: string) {
  const hash = studioModelAssetHash(body);
  const original = await uploadGeneratedImage(body, { userId: "catalog", outfitId: version, cacheKey: appearanceKey, storageKey: `studio-model-assets/${version}/${appearanceKey}/${hash}.png`, contentType: "image/png", format: "png", width: 1024, height: 1536 });
  const thumbnailBody = await sharp(body).resize({ width: 320, height: 480, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const thumbnail = await uploadGeneratedImage(thumbnailBody, { userId: "catalog", outfitId: version, cacheKey: `${appearanceKey}:thumbnail`, storageKey: `studio-model-assets/${version}/${appearanceKey}/${hash}-thumbnail.webp`, contentType: "image/webp", format: "webp", width: 320, height: 480 });
  return { hash, assetUrl: original.url, storageKey: original.storageKey, thumbnailUrl: thumbnail.url };
}
