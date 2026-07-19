export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { requestMeta } from "@/lib/audit";
import { isObjectId, serializeWardrobeUpload } from "@/lib/wardrobe";
import { WardrobeUpload } from "@/models/WardrobeUpload";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `wardrobe-upload-detail:${meta.ip}`, limit: 60, windowMs: 60 * 1000 });
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "Wardrobe upload was not found.");

    const upload = await WardrobeUpload.findOne({ _id: id, userId: auth.user._id });
    if (!upload) return apiError("NOT_FOUND", "Wardrobe upload was not found.");

    return apiSuccess({ upload: serializeWardrobeUpload(upload) });
  } catch (error) {
    logSafeError("wardrobe.upload.detail", error);
    return apiError("INTERNAL_ERROR", "Unable to load wardrobe upload right now.");
  }
}
