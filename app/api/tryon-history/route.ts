export const dynamic = "force-dynamic";

import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { logSafeError } from "@/lib/security/safe-log";
import { buildTryOnHistory } from "@/lib/tryon/tryon-history";
import { TryOnGeneration } from "@/models/TryOnGeneration";

export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const generations = await TryOnGeneration.find({
      userId: auth.user._id,
      status: "completed",
      $or: [
        { storageKey: { $type: "string", $ne: "" } },
        { previewUrl: { $type: "string", $ne: "" } }
      ]
    })
      .sort({ completedAt: -1, createdAt: -1 })
      .limit(100)
      .select("generationId outfitId status previewUrl storageKey completedAt createdAt updatedAt")
      .lean();

    return apiSuccess({ tryOns: buildTryOnHistory(generations, 60) });
  } catch (error) {
    logSafeError("tryon-history.list", error);
    return apiError("INTERNAL_ERROR", "Unable to load your Try-On history right now.");
  }
}
