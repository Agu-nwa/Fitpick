export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { requestMeta } from "@/lib/audit";
import { getMemorySummary, serializeMemorySummary } from "@/lib/fashion-memory/fashion-memory";
import { buildOutfitHistorySummary, getRecentOutfitHistory } from "@/lib/recommendation/history";
import { applySituationToStyleProfile, normalizeSituationContext } from "@/lib/recommendation/situation-context";
import { buildWardrobePlan, serializeStylistPlan } from "@/lib/recommendation/wardrobe-planner";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { getOrCreateStyleProfile, serializeStyleProfile } from "@/lib/style-profile/style-profile";
import { readJson, validateBody } from "@/lib/validation";
import { getCompatibilityEdgesForItems } from "@/lib/wardrobe/compatibility/compatibility-graph";
import { StylistPlan } from "@/models/StylistPlan";
import { StylePreference } from "@/models/StylePreference";
import { WardrobeItem } from "@/models/WardrobeItem";
import { WornLook } from "@/models/WornLook";
import { stylistPlanCreateSchema } from "@/schemas/stylist-plan.schema";

export async function GET(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `stylist-plans:list:${meta.ip}`, limit: 60, windowMs: 60_000, operation: "stylist-plans-list" });
  if (limited) return limited;
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const plans = await StylistPlan.find({ userId: auth.user._id }).sort({ createdAt: -1 }).limit(30).lean();
    return apiSuccess({ plans: plans.map(serializeStylistPlan) });
  } catch (error) {
    logSafeError("stylist.plans.list", error);
    return apiError("INTERNAL_ERROR", "Unable to load wardrobe plans right now.");
  }
}

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `stylist-plans:create:${meta.ip}`, limit: 10, windowMs: 60_000, operation: "stylist-plans-create" });
  if (limited) return limited;
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const parsed = validateBody(stylistPlanCreateSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const [wardrobeItems, preferences, profile, memory, history, wornLooks] = await Promise.all([
      WardrobeItem.find({ userId: auth.user._id, archivedAt: null }).lean(),
      StylePreference.findOne({ userId: auth.user._id }).lean(),
      getOrCreateStyleProfile(auth.user._id),
      getMemorySummary(auth.user._id),
      getRecentOutfitHistory(auth.user._id, 80),
      WornLook.find({ userId: auth.user._id }).sort({ wornAt: -1 }).limit(40).lean()
    ]);
    if (!wardrobeItems.length) return apiError("BAD_REQUEST", "Add wardrobe items before creating a plan.");

    const serializedProfile = serializeStyleProfile(profile);
    const situation = normalizeSituationContext({
      message: parsed.data.occasions.join(", "),
      explicit: parsed.data.situation,
      profile: serializedProfile,
      weatherAvailable: Boolean(parsed.data.weatherContext)
    });
    const itemIds = wardrobeItems.map((item: any) => String(item._id));
    const compatibilityEdges = await getCompatibilityEdgesForItems({ userId: String(auth.user._id), itemIds, minScore: 45 });
    const built = buildWardrobePlan({
      type: parsed.data.type,
      title: parsed.data.title,
      days: parsed.data.days,
      occasions: parsed.data.occasions,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      destination: parsed.data.destination,
      weatherContext: parsed.data.weatherContext,
      weatherAvailability: parsed.data.weatherContext ? "available" : "not_requested",
      formality: parsed.data.formality,
      styleDirection: parsed.data.styleDirection,
      allowNeedsCare: parsed.data.allowNeedsCare,
      wardrobeItems,
      preferences,
      styleProfile: applySituationToStyleProfile(serializedProfile, situation),
      memorySummary: serializeMemorySummary(memory),
      outfitHistorySummary: buildOutfitHistorySummary(history),
      compatibilityEdges,
      wornLooks
    });
    const plan = await StylistPlan.create({ userId: auth.user._id, ...built });
    return apiSuccess({ plan: serializeStylistPlan(plan), wardrobeReadiness: built.wardrobeReadiness }, { status: 201, message: "Wardrobe plan created." });
  } catch (error) {
    logSafeError("stylist.plans.create", error);
    return apiError("INTERNAL_ERROR", "Unable to create that wardrobe plan right now.");
  }
}
