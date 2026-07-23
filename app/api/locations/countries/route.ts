export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { requestMeta } from "@/lib/audit";
import { listLocationCountries } from "@/lib/locations/location-data";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";

export async function GET(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `locations:countries:${meta.ip}`, limit: 60, windowMs: 60 * 1000, operation: "locations-countries" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    return apiSuccess({ countries: listLocationCountries() });
  } catch (error) {
    logSafeError("locations.countries", error);
    return apiError("INTERNAL_ERROR", "Unable to load countries right now.");
  }
}
