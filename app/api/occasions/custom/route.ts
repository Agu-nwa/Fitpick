export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { readJson, validateBody } from "@/lib/validation";
import { Occasion } from "@/models/Occasion";
import { customOccasionSchema } from "@/schemas/occasion.schema";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const parsed = validateBody(customOccasionSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const occasion = await Occasion.create({
      ...parsed.data,
      isGlobal: false,
      userId: auth.user._id
    });

    return apiSuccess({ occasion }, { message: "Occasion added.", status: 201 });
  } catch (error) {
    console.error("FitPick custom occasion error:", error);
    return apiError("INTERNAL_ERROR", "Unable to add this occasion right now.");
  }
}
