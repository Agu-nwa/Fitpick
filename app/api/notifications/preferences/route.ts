export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { readJson, validateBody } from "@/lib/validation";
import { NotificationPreference } from "@/models/NotificationPreference";
import { notificationPreferenceSchema } from "@/schemas/notification.schema";

function serializeNotificationPreferences(preferences: any) {
  return {
    morningReminder: Boolean(preferences.morningReminder),
    weatherAlerts: Boolean(preferences.weatherAlerts),
    eventPrep: Boolean(preferences.eventPrep),
    repeatWarnings: Boolean(preferences.repeatWarnings),
    pushTokenExists: Boolean(preferences.pushToken),
    quietHours: preferences.quietHours || { enabled: false, start: "", end: "" },
    timezone: preferences.timezone || ""
  };
}

export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const preferences =
      (await NotificationPreference.findOne({ userId: auth.user._id }).lean()) ||
      (await NotificationPreference.create({ userId: auth.user._id }));

    return apiSuccess({ preferences: serializeNotificationPreferences(preferences) });
  } catch (error) {
    logSafeError("notifications.get", error);
    return apiError("INTERNAL_ERROR", "Unable to load notification preferences right now.");
  }
}

export async function PATCH(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `notifications:patch:${meta.ip}`, limit: 30, windowMs: 60 * 1000, operation: "notifications-patch" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const parsed = validateBody(notificationPreferenceSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const preferences = await NotificationPreference.findOneAndUpdate(
      { userId: auth.user._id },
      { $set: parsed.data },
      { upsert: true, new: true }
    ).lean();

    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "notifications.update",
      entityType: "NotificationPreference",
      entityId: String(preferences?._id || "")
    });

    return apiSuccess({ preferences: serializeNotificationPreferences(preferences) }, { message: "Notification preferences updated." });
  } catch (error) {
    logSafeError("notifications.patch", error);
    return apiError("INTERNAL_ERROR", "Unable to update notification preferences right now.");
  }
}
