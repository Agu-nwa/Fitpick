export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { validateBody } from "@/lib/validation";
import { getWeatherForecast } from "@/lib/weather/weather-service";

const weatherQuerySchema = z.object({
  city: z.string().trim().max(120).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  days: z.coerce.number().int().min(1).max(7).optional()
});

export async function GET(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `weather-forecast:${meta.ip}`, limit: 60, windowMs: 60 * 1000, operation: "weather-forecast" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const parsed = validateBody(weatherQuerySchema, Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.ok) return parsed.response;

    const city = parsed.data.city || auth.user.weatherLocationName || "";
    const latitude = parsed.data.latitude ?? auth.user.weatherLatitude ?? null;
    const longitude = parsed.data.longitude ?? auth.user.weatherLongitude ?? null;

    if (!city && (latitude === null || longitude === null)) {
      return apiSuccess({
        status: "location_needed",
        forecast: null,
        safeMessage: "Add a city to get weather-aware styling."
      });
    }

    try {
      const forecast = await getWeatherForecast({
        city,
        latitude,
        longitude,
        days: parsed.data.days || 7
      });

      return apiSuccess({
        status: "ready",
        forecast,
        safeMessage: ""
      });
    } catch (error) {
      logSafeError("weather.forecast.provider", error);
      return apiSuccess({
        status: "unavailable",
        forecast: null,
        safeMessage: "Weather guidance is not available right now."
      });
    }
  } catch (error) {
    logSafeError("weather.forecast", error);
    return apiError("INTERNAL_ERROR", "Unable to load weather guidance right now.");
  }
}
