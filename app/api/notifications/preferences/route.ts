export const dynamic = "force-dynamic";

import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { phasePlaceholder } from "@/lib/phase-placeholder";
import { NotificationPreference } from "@/models/NotificationPreference";

export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const preferences =
      (await NotificationPreference.findOne({ userId: auth.user._id }).lean()) ||
      (await NotificationPreference.create({ userId: auth.user._id }));

    return apiSuccess({ preferences });
  } catch (error) {
    console.error("FitPick notification preferences error:", error);
    return apiError("INTERNAL_ERROR", "Unable to load notification preferences right now.");
  }
}

export async function PATCH() {
  return phasePlaceholder("Notification preference update", "Phase 5B");
}
