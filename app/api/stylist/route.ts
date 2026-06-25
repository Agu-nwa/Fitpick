export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiSuccess, apiError }
from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { askStylist }
from "@/lib/ai/stylist";

export async function POST(
  request: NextRequest
) {
  try {
    const auth = await requireUser();

    if (!auth.ok) return auth.response;

    const body = await request.json();

    const result = await askStylist({
      message: body.message,
      wardrobeSummary:
        body.wardrobeSummary || ""
    });

    return apiSuccess(result);

  } catch {
    return apiError(
      "INTERNAL_ERROR",
      "Stylist unavailable."
    );
  }
}