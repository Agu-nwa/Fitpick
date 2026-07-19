export const dynamic = "force-dynamic";

import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { getOrCreateCreditWallet } from "@/lib/credits/credit-wallet";
import { logSafeError } from "@/lib/security/safe-log";
import { NotificationPreference } from "@/models/NotificationPreference";
import { StylePreference } from "@/models/StylePreference";
import { toSafeUser } from "@/models/User";

export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const [stylePreference, notificationPreference, wallet] = await Promise.all([
      StylePreference.findOne({ userId: auth.user._id }).lean(),
      NotificationPreference.findOne({ userId: auth.user._id }).lean(),
      getOrCreateCreditWallet(auth.user._id)
    ]);

    return apiSuccess({
      user: toSafeUser(auth.user),
      preferences: stylePreference,
      notifications: notificationPreference,
      wallet
    });
  } catch (error) {
    logSafeError("auth.me", error);
    return apiError("INTERNAL_ERROR", "Unable to load your session right now.");
  }
}
