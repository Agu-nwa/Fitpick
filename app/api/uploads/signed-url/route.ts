export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { rateLimitPlaceholder } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { createSignedUploadUrl } from "@/lib/storage";
import { readJson, validateBody } from "@/lib/validation";
import { signedUploadSchema } from "@/schemas/upload.schema";

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitPlaceholder({ key: `signed-upload:${meta.ip}`, limit: 30, windowMs: 60 * 1000, operation: "signed-upload" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const parsed = validateBody(signedUploadSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const upload = await createSignedUploadUrl({
      userId: String(auth.user._id),
      filename: parsed.data.filename,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
      purpose: parsed.data.purpose
    });

    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "storage.signed_upload",
      entityType: "StorageObject",
      entityId: upload.storageKey
    });

    return apiSuccess(
      { upload },
      { message: upload.ready ? "Upload access created." : "Image upload is not configured yet." }
    );
  } catch (error) {
    logSafeError("uploads.signed-url", error);
    return apiError("INTERNAL_ERROR", "Unable to create upload access right now.");
  }
}
