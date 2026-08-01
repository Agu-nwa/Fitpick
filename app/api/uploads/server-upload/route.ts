export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { createStorageKey, getAllowedImageTypes, getMaxImageSizeBytes, uploadImageObject } from "@/lib/storage";
import { normalizeUploadedImageBuffer } from "@/lib/image-normalization/server";
import { ImageUploadError, imageUploadRequirementText, messageForImageUploadError } from "@/lib/upload-limits";
import { uploadPurposeSchema } from "@/schemas/upload.schema";
import { removeBackgroundWithPhotoRoom } from "@/lib/image-processing/photoroom";

const BACKGROUND_REMOVAL_PURPOSES = new Set([
  "wardrobe_original", "wardrobe_front", "wardrobe_back", "wardrobe_additional", "stylist_reference"
]);

async function uploadCutoutWithRetry(input: Parameters<typeof uploadImageObject>[0]) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await uploadImageObject(input);
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 200));
    }
  }
  throw lastError;
}

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `server-upload:${meta.ip}`, limit: 20, windowMs: 60 * 1000, operation: "server-upload" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const formData = await request.formData();
    const file = formData.get("file");
    const purpose = formData.get("purpose");

    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return apiError("VALIDATION_ERROR", "Choose an image to upload.");
    }

    if (typeof file.size === "number" && file.size > getMaxImageSizeBytes()) {
      return apiError("VALIDATION_ERROR", messageForImageUploadError("IMAGE_TOO_LARGE"));
    }
    const parsedPurpose = uploadPurposeSchema.safeParse(typeof purpose === "string" ? purpose : undefined);
    if (!parsedPurpose.success) return apiError("VALIDATION_ERROR", imageUploadRequirementText());

    const body = Buffer.from(await file.arrayBuffer());
    const normalized = await normalizeUploadedImageBuffer({
      buffer: body,
      filename: file.name || "wardrobe-upload",
      mimeType: file.type || "",
      source: parsedPurpose.data === "avatar_model" ? "avatar_model" : "unknown"
    });
    const storageKey = createStorageKey({
      userId: String(auth.user._id),
      filename: normalized.filename,
      purpose: parsedPurpose.data
    });
    const originalUploaded = await uploadImageObject({ storageKey, mimeType: normalized.mimeType, body: normalized.buffer });
    let activeUploaded = originalUploaded;
    let cutoutUpload: null | { provider: "s3"; storageKey: string; publicUrl: string; filename: string; mimeType: string; sizeBytes: number; width: number; height: number } = null;
    let backgroundRemovalApplied = false;
    let backgroundRemovalProvider: "photoroom" | null = null;
    let backgroundRemovalWarning: string | null = null;

    if (BACKGROUND_REMOVAL_PURPOSES.has(parsedPurpose.data)) {
      const removal = await removeBackgroundWithPhotoRoom({ buffer: normalized.buffer, filename: normalized.filename, mimeType: normalized.mimeType });
      backgroundRemovalProvider = removal.provider;
      if (removal.ok) {
        try {
          const cutoutKey = createStorageKey({ userId: String(auth.user._id), filename: removal.filename, purpose: `${parsedPurpose.data}_cutout` });
          activeUploaded = await uploadCutoutWithRetry({ storageKey: cutoutKey, mimeType: removal.mimeType, body: removal.buffer });
          cutoutUpload = { provider: activeUploaded.provider, storageKey: activeUploaded.storageKey, publicUrl: activeUploaded.url, filename: removal.filename, mimeType: removal.mimeType, sizeBytes: removal.buffer.byteLength, width: removal.width, height: removal.height };
          backgroundRemovalApplied = true;
        } catch {
          backgroundRemovalWarning = "The cutout could not be saved; the original photo was used.";
          activeUploaded = originalUploaded;
        }
      } else {
        backgroundRemovalWarning = removal.warning;
      }
    }

    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "storage.signed_upload",
      entityType: "StorageObject",
      entityId: originalUploaded.storageKey
    });

    return apiSuccess(
      {
        upload: {
          ready: true,
          provider: activeUploaded.provider,
          storageKey: activeUploaded.storageKey,
          publicUrl: activeUploaded.url,
          filename: cutoutUpload?.filename || normalized.filename,
          mimeType: cutoutUpload?.mimeType || normalized.mimeType,
          sizeBytes: cutoutUpload?.sizeBytes || normalized.sizeBytes,
          width: cutoutUpload?.width || normalized.width,
          height: cutoutUpload?.height || normalized.height,
          normalized: {
            originalMimeType: normalized.original.mimeType,
            detectedMimeType: normalized.original.detectedMimeType,
            detectedFormat: normalized.original.detectedFormat,
            originalSizeBytes: normalized.original.sizeBytes,
            originalWidth: normalized.original.width,
            originalHeight: normalized.original.height,
            outputMimeType: normalized.mimeType,
            outputSizeBytes: normalized.sizeBytes,
            warnings: normalized.warnings
          },
          backgroundRemovalApplied,
          backgroundRemovalProvider,
          backgroundRemovalWarning,
          originalUpload: {
            provider: originalUploaded.provider,
            storageKey: originalUploaded.storageKey,
            publicUrl: originalUploaded.url,
            filename: normalized.filename,
            mimeType: normalized.mimeType,
            sizeBytes: normalized.sizeBytes,
            width: normalized.width,
            height: normalized.height
          },
          cutoutUpload,
          maxSizeBytes: getMaxImageSizeBytes(),
          allowedMimeTypes: getAllowedImageTypes(),
          nextAction: "uploaded_to_s3"
        }
      },
      { message: "Image uploaded." }
    );
  } catch (error) {
    logSafeError("uploads.server-upload", error);
    if (error instanceof ImageUploadError) {
      return apiError("VALIDATION_ERROR", error.message || "We couldn't process this image. Try another photo.");
    }
    return apiError("INTERNAL_ERROR", "Unable to upload image right now.");
  }
}
