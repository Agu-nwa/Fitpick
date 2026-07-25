export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { rateLimitRequest } from "@/lib/rate-limit";
import { requestMeta } from "@/lib/audit";
import { normalizeUploadedImageBuffer } from "@/lib/image-normalization/server";
import { ImageUploadError, messageForImageUploadError } from "@/lib/upload-limits";
import { logSafeError } from "@/lib/security/safe-log";
import { uploadImageObject } from "@/lib/storage";
import { getSupportAttachmentMaxBytes, isSupportChatEnabled } from "@/lib/support/config";
import { createSupportAttachmentStorageKey } from "@/lib/support/support-service";

const acceptedInputTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `support-attachment:${meta.ip}`, limit: 12, windowMs: 60_000, operation: "support-attachment" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!isSupportChatEnabled()) return apiError("SETUP_REQUIRED", "Support chat is not available right now.", { status: 503 });
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") return apiError("VALIDATION_ERROR", "Choose an image to attach.");
    if (!acceptedInputTypes.has((file.type || "").toLowerCase())) return apiError("VALIDATION_ERROR", "Choose a JPEG, PNG, or WebP image.");
    if (typeof file.size === "number" && file.size > getSupportAttachmentMaxBytes()) return apiError("VALIDATION_ERROR", messageForImageUploadError("IMAGE_TOO_LARGE"));

    const body = Buffer.from(await file.arrayBuffer());
    if (body.byteLength > getSupportAttachmentMaxBytes()) return apiError("VALIDATION_ERROR", messageForImageUploadError("IMAGE_TOO_LARGE"));
    const normalized = await normalizeUploadedImageBuffer({ buffer: body, filename: file.name || "support-image", mimeType: file.type || "", source: "unknown" });
    const storageKey = createSupportAttachmentStorageKey({ actorId: String(auth.user._id), filename: normalized.filename });
    const uploaded = await uploadImageObject({ storageKey, mimeType: normalized.mimeType, body: normalized.buffer });
    return apiSuccess({
      attachment: {
        key: uploaded.storageKey,
        url: uploaded.url,
        filename: normalized.filename,
        mimeType: normalized.mimeType,
        size: normalized.sizeBytes,
        width: normalized.width,
        height: normalized.height
      }
    });
  } catch (error) {
    logSafeError("support.attachment", error);
    if (error instanceof ImageUploadError) return apiError("VALIDATION_ERROR", error.message || "We couldn't process this image. Try another photo.");
    return apiError("INTERNAL_ERROR", "Unable to attach image right now.");
  }
}
