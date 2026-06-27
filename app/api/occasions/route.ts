export const dynamic = "force-dynamic";

import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { logSafeError } from "@/lib/security/safe-log";
import { Occasion } from "@/models/Occasion";

export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const occasions = await Occasion.find({
      $or: [{ isGlobal: true }, { userId: auth.user._id }]
    })
      .sort({ group: 1, name: 1 })
      .lean();

    return apiSuccess({ occasions });
  } catch (error) {
    logSafeError("occasions.get", error);
    return apiError("INTERNAL_ERROR", "Unable to load occasions right now.");
  }
}
