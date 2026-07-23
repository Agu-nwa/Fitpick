export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { findLocationCity } from "@/lib/locations/location-data";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { readJson, validateBody } from "@/lib/validation";
import { toSafeUser } from "@/models/User";

const updateLocationSchema = z.object({
  countryCode: z.string().trim().regex(/^[a-zA-Z]{2}$/),
  cityId: z.string().trim().min(3).max(80).regex(/^[a-z0-9-]+$/)
});

export async function PATCH(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `users-me-location:${meta.ip}`, limit: 30, windowMs: 60 * 1000, operation: "users-me-location" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const parsed = validateBody(updateLocationSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const city = findLocationCity(parsed.data.countryCode, parsed.data.cityId);
    if (!city) return apiError("VALIDATION_ERROR", "Choose a valid city for the selected country.");

    auth.user.weatherLocationName = `${city.cityName}, ${city.countryName}`;
    auth.user.weatherCountryCode = city.countryCode;
    auth.user.weatherCountryName = city.countryName;
    auth.user.weatherCityName = city.cityName;
    auth.user.weatherLatitude = city.latitude;
    auth.user.weatherLongitude = city.longitude;
    auth.user.weatherTimezone = city.timezone;
    auth.user.timezone = city.timezone;
    auth.user.weatherLocationUpdatedAt = new Date();

    await auth.user.save();
    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "user.update",
      entityType: "User",
      entityId: String(auth.user._id)
    });

    return apiSuccess({
      user: toSafeUser(auth.user),
      location: city
    }, { message: "Location saved." });
  } catch (error) {
    logSafeError("users.me.location.patch", error);
    return apiError("INTERNAL_ERROR", "Unable to save your location right now.");
  }
}
