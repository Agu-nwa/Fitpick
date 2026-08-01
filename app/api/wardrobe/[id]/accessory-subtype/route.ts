export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { readJson, validateBody } from "@/lib/validation";
import { isObjectId, serializeWardrobeItem } from "@/lib/wardrobe";
import { accessorySubtypeValues, userConfirmedResolution } from "@/lib/wardrobe/accessory-subtypes";
import { WardrobeItem } from "@/models/WardrobeItem";

const schema = z.object({ accessorySubtype: z.enum(accessorySubtypeValues).nullable() }).strict();
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `accessory-subtype-confirm:${meta.ip}`, limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  try {
    const { id } = await context.params;
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "Wardrobe item was not found.");
    const parsed = validateBody(schema, await readJson(request));
    if (!parsed.ok) return parsed.response;
    const item = await WardrobeItem.findOneAndUpdate(
      { _id: id, userId: auth.user._id, category: "accessories", archivedAt: null },
      { $set: { accessorySubtype: parsed.data.accessorySubtype, accessorySubtypeResolution: userConfirmedResolution(parsed.data.accessorySubtype) } },
      { new: true }
    );
    if (!item) return apiError("NOT_FOUND", "Accessory was not found.");
    await recordAuditEvent({ request, userId: String(auth.user._id), action: "wardrobe.update", entityType: "WardrobeItem", entityId: id });
    return apiSuccess({ item: serializeWardrobeItem(item) }, { message: parsed.data.accessorySubtype ? "Accessory type saved." : "Accessory type left unspecified." });
  } catch (error) {
    logSafeError("wardrobe.accessory-subtype-confirm", error);
    return apiError("INTERNAL_ERROR", "We couldn’t save the accessory type right now.");
  }
}
