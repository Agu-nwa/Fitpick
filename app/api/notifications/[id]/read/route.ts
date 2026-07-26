export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { serializeAppNotification } from "@/lib/notifications/app-notifications";
import { AppNotification } from "@/models/AppNotification";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `notifications:read:${meta.ip}`, limit: 120, windowMs: 60 * 1000, operation: "notifications-read" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const notification = await AppNotification.findOneAndUpdate(
      { _id: id, userId: auth.user._id },
      { $set: { readAt: new Date(), seenAt: new Date() } },
      { new: true }
    ).lean();

    if (!notification) return apiError("NOT_FOUND", "Notification not found.");

    const unreadCount = await AppNotification.countDocuments({ userId: auth.user._id, readAt: null });
    return apiSuccess({
      notifications: [serializeAppNotification(notification)],
      unreadCount
    });
  } catch (error) {
    logSafeError("notifications.read", error);
    return apiError("INTERNAL_ERROR", "Unable to update notification right now.");
  }
}
