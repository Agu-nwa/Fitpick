export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { requestMeta } from "@/lib/audit";
import { serializeStylistPlan } from "@/lib/recommendation/wardrobe-planner";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { isObjectId } from "@/lib/wardrobe";
import { StylistPlan } from "@/models/StylistPlan";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `stylist-plan:get:${meta.ip}`, limit: 60, windowMs: 60_000, operation: "stylist-plan-get" });
  if (limited) return limited;
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const { id } = await context.params;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "That wardrobe plan is no longer available.");
    const plan = await StylistPlan.findOne({ _id: id, userId: auth.user._id }).lean();
    if (!plan) return apiError("NOT_FOUND", "That wardrobe plan is no longer available.");
    return apiSuccess({ plan: serializeStylistPlan(plan) });
  } catch (error) {
    logSafeError("stylist.plan.get", error);
    return apiError("INTERNAL_ERROR", "Unable to load that wardrobe plan right now.");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `stylist-plan:delete:${meta.ip}`, limit: 30, windowMs: 60_000, operation: "stylist-plan-delete" });
  if (limited) return limited;
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const { id } = await context.params;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "That wardrobe plan is no longer available.");
    const deleted = await StylistPlan.findOneAndDelete({ _id: id, userId: auth.user._id });
    if (!deleted) return apiError("NOT_FOUND", "That wardrobe plan is no longer available.");
    return apiSuccess({ deleted: true }, { message: "Wardrobe plan deleted." });
  } catch (error) {
    logSafeError("stylist.plan.delete", error);
    return apiError("INTERNAL_ERROR", "Unable to delete that wardrobe plan right now.");
  }
}
