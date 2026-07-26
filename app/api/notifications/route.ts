export const dynamic = "force-dynamic";

import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { logSafeError } from "@/lib/security/safe-log";
import { serializeAppNotification } from "@/lib/notifications/app-notifications";
import { AppNotification } from "@/models/AppNotification";

export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const [notifications, unreadCount] = await Promise.all([
      AppNotification.find({ userId: auth.user._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      AppNotification.countDocuments({ userId: auth.user._id, readAt: null })
    ]);

    const unseenIds = notifications
      .filter((notification) => !notification.seenAt)
      .map((notification) => notification._id);
    if (unseenIds.length) {
      await AppNotification.updateMany(
        { userId: auth.user._id, _id: { $in: unseenIds } },
        { $set: { seenAt: new Date() } }
      );
    }

    return apiSuccess({
      notifications: notifications.map(serializeAppNotification),
      unreadCount
    });
  } catch (error) {
    logSafeError("notifications.list", error);
    return apiError("INTERNAL_ERROR", "Unable to load notifications right now.");
  }
}
