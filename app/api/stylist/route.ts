export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { askStylist } from "@/lib/ai/stylist";
import { requestMeta } from "@/lib/audit";
import { rateLimitPlaceholder } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { readJson, validateBody } from "@/lib/validation";

const stylistSchema = z.object({
  message: z.string().trim().min(1).max(800),
  wardrobeSummary: z.string().trim().max(4000).optional()
});

export async function POST(
  request: NextRequest
) {
  const meta = requestMeta(request);
  const limited = rateLimitPlaceholder({ key: `stylist-legacy:${meta.ip}`, limit: 20, windowMs: 60 * 1000, operation: "stylist-legacy" });
  if (limited) return limited;

  try {
    const auth = await requireUser();

    if (!auth.ok) return auth.response;

    const parsed = validateBody(stylistSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const result = await askStylist({
      message: parsed.data.message,
      wardrobeSummary: parsed.data.wardrobeSummary || "",
      ownedItemIds: []
    });

    return apiSuccess(result);

  } catch (error) {
    logSafeError("stylist.legacy", error);
    return apiError(
      "INTERNAL_ERROR",
      "Stylist unavailable."
    );
  }
}
