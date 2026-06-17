export const dynamic = "force-dynamic";

import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { PlusSubscription } from "@/models/PlusSubscription";

export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const subscription =
      (await PlusSubscription.findOne({ userId: auth.user._id }).lean()) ||
      (await PlusSubscription.create({ userId: auth.user._id }));

    return apiSuccess({ subscription });
  } catch (error) {
    console.error("FitPick plus status error:", error);
    return apiError("INTERNAL_ERROR", "Unable to load Plus status right now.");
  }
}
