export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { requestMeta } from "@/lib/audit";
import { getLocationCountry, searchLocationCities } from "@/lib/locations/location-data";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { validateBody } from "@/lib/validation";

const cityQuerySchema = z.object({
  countryCode: z.string().trim().regex(/^[a-zA-Z]{2}$/),
  query: z.string().trim().max(80).optional().or(z.literal("")),
  limit: z.coerce.number().int().min(1).max(50).optional()
});

export async function GET(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `locations:cities:${meta.ip}`, limit: 120, windowMs: 60 * 1000, operation: "locations-cities" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const parsed = validateBody(cityQuerySchema, Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.ok) return parsed.response;

    const country = getLocationCountry(parsed.data.countryCode);
    if (!country) return apiError("VALIDATION_ERROR", "Choose a supported country.");

    return apiSuccess({
      country,
      query: parsed.data.query || "",
      cities: searchLocationCities({
        countryCode: country.code,
        query: parsed.data.query || "",
        limit: parsed.data.limit || 20
      })
    });
  } catch (error) {
    logSafeError("locations.cities", error);
    return apiError("INTERNAL_ERROR", "Unable to load cities right now.");
  }
}
