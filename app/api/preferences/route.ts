export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { readJson, validateBody } from "@/lib/validation";
import { StylePreference } from "@/models/StylePreference";
import { stylePreferenceSchema } from "@/schemas/preference.schema";

export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const preferences =
      (await StylePreference.findOne({ userId: auth.user._id }).lean()) ||
      (await StylePreference.create({ userId: auth.user._id }));

    return apiSuccess({ preferences });
  } catch (error) {
    console.error("FitPick preferences get error:", error);
    return apiError("INTERNAL_ERROR", "Unable to load preferences right now.");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const parsed = validateBody(stylePreferenceSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const preferences = await StylePreference.findOneAndUpdate(
      { userId: auth.user._id },
      { $set: parsed.data },
      { new: true, upsert: true }
    ).lean();

    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "preferences.update",
      entityType: "StylePreference",
      entityId: String(preferences?._id || "")
    });

    return apiSuccess({ preferences }, { message: "Preferences updated." });
  } catch (error) {
    console.error("FitPick preferences patch error:", error);
    return apiError("INTERNAL_ERROR", "Unable to update preferences right now.");
  }
}
