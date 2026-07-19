export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { getOrCreateAvatarProfile } from "@/lib/avatar/avatar-profile";
import { readJson, validateBody } from "@/lib/validation";
import { updateUserSchema } from "@/schemas/user.schema";
import { toSafeUser } from "@/models/User";

export async function PATCH(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `users-me:patch:${meta.ip}`, limit: 30, windowMs: 60 * 1000, operation: "users-me-patch" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const parsed = validateBody(updateUserSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    if (parsed.data.name !== undefined) auth.user.name = parsed.data.name;
    if (parsed.data.avatarUrl !== undefined) auth.user.avatarUrl = parsed.data.avatarUrl;
    if (parsed.data.timezone !== undefined) auth.user.timezone = parsed.data.timezone;
    if (parsed.data.locale !== undefined) auth.user.locale = parsed.data.locale;
    if (parsed.data.weatherLocationName !== undefined) auth.user.weatherLocationName = parsed.data.weatherLocationName;
    if (parsed.data.weatherLatitude !== undefined) auth.user.weatherLatitude = parsed.data.weatherLatitude;
    if (parsed.data.weatherLongitude !== undefined) auth.user.weatherLongitude = parsed.data.weatherLongitude;
    if (
      parsed.data.weatherLocationName !== undefined ||
      parsed.data.weatherLatitude !== undefined ||
      parsed.data.weatherLongitude !== undefined
    ) {
      auth.user.weatherLocationUpdatedAt = new Date();
    }
    if (parsed.data.modelSetupCompleted) {
      const avatarProfile = await getOrCreateAvatarProfile(auth.user._id);
      if (!avatarProfile.consentAccepted || !avatarProfile.uploadedModelImageUrl) {
        return apiError("BAD_REQUEST", "Upload a full-body model photo before completing setup.");
      }
      auth.user.modelSetupCompletedAt = new Date();
    }

    await auth.user.save();
    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "user.update",
      entityType: "User",
      entityId: String(auth.user._id)
    });

    return apiSuccess({ user: toSafeUser(auth.user) }, { message: "Profile updated." });
  } catch (error) {
    logSafeError("users.me.patch", error);
    return apiError("INTERNAL_ERROR", "Unable to update your profile right now.");
  }
}
