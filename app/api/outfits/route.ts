export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { serializeOutfit } from "@/lib/recommendation/engine";
import { logSafeError } from "@/lib/security/safe-log";
import { OutfitRecommendation } from "@/models/OutfitRecommendation";
import { WardrobeItem } from "@/models/WardrobeItem";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const savedOnly = request.nextUrl.searchParams.get("saved") !== "false";
    const favoritesOnly = request.nextUrl.searchParams.get("favorites") === "true";
    const query: Record<string, unknown> = { userId: auth.user._id };
    if (savedOnly) query.savedAt = { $ne: null };
    if (favoritesOnly) query.favorite = true;

    const outfits = await OutfitRecommendation.find(query).sort({ savedAt: -1, createdAt: -1 }).limit(40).lean();
    const itemIds = Array.from(new Set(outfits.flatMap((outfit) => (outfit.itemIds || []).map(String))));
    const wardrobeItems = await WardrobeItem.find({ _id: { $in: itemIds }, userId: auth.user._id, archivedAt: null }).lean();
    const itemsById = new Map(wardrobeItems.map((item: any) => [String(item._id), item]));

    const serialized = outfits.flatMap((outfit) => {
      const persistedIds = (outfit.itemIds || []).map(String);
      const items = persistedIds.map((id) => itemsById.get(id)).filter(Boolean);
      if (!items.length || items.length !== persistedIds.length) return [];
      return [serializeOutfit(outfit, items)];
    });

    return apiSuccess({ outfits: serialized });
  } catch (error) {
    logSafeError("outfits.saved-list", error);
    return apiError("INTERNAL_ERROR", "Unable to load saved looks right now.");
  }
}
