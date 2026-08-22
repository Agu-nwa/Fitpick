import sharp from "sharp";
import { IMAGE_UPLOAD_POLICY } from "@/lib/image-upload-policy";
import { downloadImageObject, uploadImageObject } from "@/lib/storage";
import { normalizeStorageKey } from "@/lib/storage/url";

export const WARDROBE_THUMBNAIL_WIDTH = 640;
export const WARDROBE_THUMBNAIL_HEIGHT = 960;
export const WARDROBE_THUMBNAIL_MIME_TYPE = "image/webp";

export function wardrobeThumbnailStorageKey(originalStorageKey: string) {
  const normalized = normalizeStorageKey(originalStorageKey);
  const withoutExtension = normalized.replace(/\.[a-z0-9]+$/i, "");
  return `${withoutExtension}.thumbnail.webp`;
}

export async function createWardrobeThumbnailBuffer(body: Buffer) {
  const result = await sharp(body, {
    failOn: "error",
    limitInputPixels: IMAGE_UPLOAD_POLICY.maxInputPixels
  })
    .rotate()
    .resize({
      width: WARDROBE_THUMBNAIL_WIDTH,
      height: WARDROBE_THUMBNAIL_HEIGHT,
      fit: "inside",
      withoutEnlargement: true
    })
    .webp({ quality: 78, alphaQuality: 84, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  if (!result.info.width || !result.info.height || !result.data.byteLength) {
    throw new Error("Wardrobe thumbnail generation failed.");
  }

  return {
    buffer: result.data,
    mimeType: WARDROBE_THUMBNAIL_MIME_TYPE,
    width: result.info.width,
    height: result.info.height,
    bytes: result.data.byteLength
  };
}

export async function createWardrobeThumbnailFromStorage(originalStorageKey: string, options: { downloadTimeoutMs?: number } = {}) {
  let source: Awaited<ReturnType<typeof downloadImageObject>>;
  try {
    source = await downloadImageObject({ storageKey: originalStorageKey, timeoutMs: options.downloadTimeoutMs });
  } catch (error) {
    throw new Error(`Wardrobe thumbnail source download failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  let thumbnail: Awaited<ReturnType<typeof createWardrobeThumbnailBuffer>>;
  try {
    thumbnail = await createWardrobeThumbnailBuffer(source.body);
  } catch (error) {
    throw new Error(`Wardrobe thumbnail conversion failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  let uploaded: Awaited<ReturnType<typeof uploadImageObject>>;
  try {
    uploaded = await uploadImageObject({
      storageKey: wardrobeThumbnailStorageKey(originalStorageKey),
      mimeType: thumbnail.mimeType,
      body: thumbnail.buffer
    });
  } catch (error) {
    throw new Error(`Wardrobe thumbnail upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  return {
    url: uploaded.url,
    storageKey: uploaded.storageKey,
    provider: uploaded.provider,
    width: thumbnail.width,
    height: thumbnail.height,
    bytes: thumbnail.bytes,
    status: "ready" as const,
    processedAt: new Date().toISOString(),
    errorMessage: ""
  };
}
