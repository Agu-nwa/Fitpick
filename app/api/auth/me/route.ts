export const dynamic = "force-dynamic";

import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { NotificationPreference } from "@/models/NotificationPreference";
import { PlusSubscription } from "@/models/PlusSubscription";
import { StylePreference } from "@/models/StylePreference";
import { toSafeUser } from "@/models/User";

export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const [stylePreference, notificationPreference, subscription] = await Promise.all([
      StylePreference.findOne({ userId: auth.user._id }).lean(),
      NotificationPreference.findOne({ userId: auth.user._id }).lean(),
      PlusSubscription.findOne({ userId: auth.user._id }).lean()
    ]);

    return apiSuccess({
      user: toSafeUser(auth.user),
      preferences: stylePreference,
      notifications: notificationPreference,
      subscription
    });
  } catch (error) {
    console.error("FitPick me error:", error);
    return apiError("INTERNAL_ERROR", "Unable to load your session right now.");
  }
}
