export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { createStorageKey, getAllowedImageTypes, getMaxImageSizeBytes, uploadImageObject } from "@/lib/storage";
import { imageUploadRequirementText } from "@/lib/upload-limits";
import { formatZodError } from "@/lib/validation";
import { signedUploadSchema } from "@/schemas/upload.schema";

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

    const parsed = signedUploadSchema.safeParse({
      filename: file.name || "wardrobe-upload",
      mimeType: file.type || "image/jpeg",
      sizeBytes: file.size,
      purpose: typeof purpose === "string" ? purpose : "wardrobe_original"
    });

    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", imageUploadRequirementText(), {
        details: formatZodError(parsed.error)
      });
    }

    const storageKey = createStorageKey({
      userId: String(auth.user._id),
      filename: parsed.data.filename,
      purpose: parsed.data.purpose
    });
    const body = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadImageObject({ storageKey, mimeType: parsed.data.mimeType, body });

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
          maxSizeBytes: getMaxImageSizeBytes(),
          allowedMimeTypes: getAllowedImageTypes(),
          nextAction: "uploaded_to_s3"
        }
      },
      { message: "Image uploaded." }
    );
  } catch (error) {
    logSafeError("uploads.server-upload", error);
    return apiError("INTERNAL_ERROR", "Unable to upload image right now.");
  }
}
