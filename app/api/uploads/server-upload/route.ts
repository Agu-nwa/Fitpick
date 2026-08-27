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
import { createHash } from "node:crypto";
import { createPerceptualImageHash } from "@/lib/image-processing/perceptual-hash";
import { hasPhotoStorageConsent } from "@/lib/privacy/privacy-preferences";

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `server-upload:${meta.ip}`, limit: 20, windowMs: 60 * 1000, operation: "server-upload" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!(await hasPhotoStorageConsent(auth.user._id))) {
      return apiError("CONSENT_REQUIRED", "Allow private photo storage in Profile → Privacy before uploading images.");
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const purpose = formData.get("purpose");

    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return apiError("VALIDATION_ERROR", "Choose an image to upload.");
    }

    if (typeof file.size === "number" && file.size > getMaxImageSizeBytes()) {
      return apiError("VALIDATION_ERROR", messageForImageUploadError("IMAGE_TOO_LARGE"));
    }
    const parsedPurpose = uploadPurposeSchema.safeParse(typeof purpose === "string" ? purpose : "wardrobe_original");
    if (!parsedPurpose.success) return apiError("VALIDATION_ERROR", imageUploadRequirementText());

    const body = Buffer.from(await file.arrayBuffer());
    const normalized = await normalizeUploadedImageBuffer({
      buffer: body,
      filename: file.name || "wardrobe-upload",
      mimeType: file.type || "",
      source: parsedPurpose.data === "avatar_model" ? "avatar_model" : "unknown"
    });
    const userId = String(auth.user._id);
    const originalStorageKey = createStorageKey({
      userId,
      filename: normalized.filename,
      purpose: `${parsedPurpose.data}_original`
    });
    const originalUploaded = await uploadImageObject({ storageKey: originalStorageKey, mimeType: normalized.mimeType, body: normalized.buffer });
    // Preserve the normalized original. Clear, contrasting photo guidance now replaces paid background removal.
    const processed = {
      applied: false,
      buffer: normalized.buffer,
      mimeType: normalized.mimeType,
      filename: normalized.filename,
      width: normalized.width,
      height: normalized.height,
      provider: "",
      state: "not_requested"
    };
    const storageKey = createStorageKey({
      userId: String(auth.user._id),
      filename: processed.filename,
      purpose: processed.applied ? `${parsedPurpose.data}_white` : parsedPurpose.data
    });
    const uploaded = processed.applied
      ? await uploadImageObject({ storageKey, mimeType: processed.mimeType, body: processed.buffer })
      : originalUploaded;
    const contentHash = createHash("sha256").update(normalized.buffer).digest("hex");
    const perceptualHash = await createPerceptualImageHash(normalized.buffer);

    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "storage.signed_upload",
      entityType: "StorageObject",
      entityId: uploaded.storageKey
    });

    return apiSuccess(
      {
        upload: {
          ready: true,
          provider: uploaded.provider,
          storageKey: uploaded.storageKey,
          publicUrl: uploaded.url,
          filename: processed.filename,
          mimeType: processed.mimeType,
          sizeBytes: processed.buffer.byteLength,
          width: processed.width,
          height: processed.height,
          contentHash,
          perceptualHash,
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
          maxSizeBytes: getMaxImageSizeBytes(),
          allowedMimeTypes: getAllowedImageTypes(),
          original: {
            storageKey: originalUploaded.storageKey,
            publicUrl: originalUploaded.url,
            filename: normalized.filename,
            mimeType: normalized.mimeType,
            sizeBytes: normalized.sizeBytes,
            width: normalized.width,
            height: normalized.height
          },
          backgroundRemovalState: processed.state,
          backgroundRemovalApplied: processed.applied,
          backgroundRemovalProvider: processed.provider,
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
