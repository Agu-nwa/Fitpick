import { buildRecommendation, type EngineInput } from "@/lib/recommendation/engine";
import { wardrobeGapInsights, wardrobeReadiness } from "@/lib/recommendation/gaps";

export type StylistPlanType = "weekly" | "capsule" | "packing";

type PlannerInput = Omit<EngineInput, "occasionName" | "recommendationMode"> & {
  type: StylistPlanType;
  days: number;
  occasions: string[];
  title?: string;
  startDate?: string;
  endDate?: string;
  destination?: string;
};

function itemId(item: any) {
  return String(item?._id || item?.id || "");
}

function itemName(item: any) {
  return item.name || [item.color, item.subcategory || item.category].filter(Boolean).join(" ") || "Wardrobe item";
}

function usageRank(item: any) {
  const recommended = Number(item.recommendationCount || 0);
  const worn = Number(item.timesWorn || 0);
  const lastUsed = Math.max(
    item.lastWornAt ? new Date(item.lastWornAt).getTime() : 0,
    item.lastRecommendedAt ? new Date(item.lastRecommendedAt).getTime() : 0
  );
  return recommended * 3 + worn * 5 + lastUsed / 1e12;
}

export function findUnderusedWardrobeItems(items: any[], limit = 12) {
  return items
    .filter((item) => !item.archivedAt && item.condition === "ready")
    .sort((a, b) => usageRank(a) - usageRank(b) || itemId(a).localeCompare(itemId(b)))
    .slice(0, limit);
}

function augmentHistory(summary: any, plannedItemIdLists: string[][]) {
  const counts = { ...(summary?.recentItemRecommendationCounts || {}) };
  for (const ids of plannedItemIdLists) for (const id of ids) counts[id] = (counts[id] || 0) + 1;
  return {
    ...(summary || {}),
    eventCount: Number(summary?.eventCount || 0) + plannedItemIdLists.length,
    recentRecommendationItemIdLists: [...plannedItemIdLists.slice().reverse(), ...(summary?.recentRecommendationItemIdLists || [])].slice(0, 30),
    lastRecommendationItemIds: plannedItemIdLists.at(-1) || summary?.lastRecommendationItemIds || [],
    recentItemRecommendationCounts: counts,
    recentRecommendedItemIds: Array.from(new Set([...plannedItemIdLists.flat(), ...(summary?.recentRecommendedItemIds || [])])).slice(0, 80)
  };
}

function defaultTitle(type: StylistPlanType, destination?: string) {
  if (type === "packing") return destination ? `${destination} packing plan` : "Packing plan";
  if (type === "capsule") return "Wardrobe capsule";
  return "Weekly wardrobe plan";
}

export function buildWardrobePlan(input: PlannerInput) {
  const requestedLooks = Math.max(1, Math.min(input.days, input.type === "capsule" ? 10 : 14));
  const plannedItemIdLists: string[][] = [];
  const signatures = new Set<string>();
  const looks: any[] = [];
  const warnings: string[] = [];

  for (let index = 0; index < requestedLooks; index += 1) {
    const occasion = input.occasions[index % input.occasions.length] || "Everyday";
    const built = buildRecommendation({
      ...input,
      occasionName: occasion,
      recommendationMode: index === 0 ? "todays_best" : "something_different",
      outfitHistorySummary: augmentHistory(input.outfitHistorySummary, plannedItemIdLists)
    });
    const ids = built.items.map(itemId).filter(Boolean);
    const signature = [...ids].sort().join("|");
    if (!signature || signatures.has(signature)) {
      warnings.push(`A distinct look could not be built for plan slot ${index + 1}.`);
      continue;
    }
    signatures.add(signature);
    plannedItemIdLists.push(ids);
    looks.push({
      slot: index + 1,
      occasion,
      title: built.title,
      itemIds: ids,
      items: built.items.map((item: any) => ({ id: itemId(item), name: itemName(item), category: item.category, condition: item.condition || "missing-tags" })),
      confidence: built.confidence,
      confidenceScore: built.confidenceScore,
      completenessStatus: built.completenessStatus,
      missingCategories: built.missingCategories,
      reasonChips: built.reasonChips,
      summary: built.summary,
      careNote: built.careNote
    });
  }

  const allItemIds = Array.from(new Set(plannedItemIdLists.flat()));
  const selectedCounts = plannedItemIdLists.flat().reduce<Record<string, number>>((counts, id) => {
    counts[id] = (counts[id] || 0) + 1;
    return counts;
  }, {});
  const itemById = new Map(input.wardrobeItems.map((item) => [itemId(item), item]));
  const packingList = allItemIds.map((id) => {
    const item = itemById.get(id);
    return { itemId: id, name: itemName(item), category: item?.category || "", plannedWearCount: selectedCounts[id] };
  });
  const unavailableItems = input.wardrobeItems
    .filter((item) => item.archivedAt || (!input.allowNeedsCare && item.condition === "needs-care"))
    .map((item) => ({ itemId: itemId(item), name: itemName(item), reason: item.archivedAt ? "archived" : "needs_care" }));
  const eligible = input.wardrobeItems.filter((item) => !item.archivedAt && (input.allowNeedsCare || item.condition !== "needs-care"));
  const underused = findUnderusedWardrobeItems(eligible);
  const underusedSelected = underused.map(itemId).filter((id) => allItemIds.includes(id));
  const gapInsights = input.occasions
    .flatMap((occasion) => wardrobeGapInsights(eligible, occasion))
    .reduce<Array<{ category: string; message: string; unlockPotential: number }>>((result, insight) => {
      const existing = result.find((entry) => entry.category === insight.category);
      if (!existing) result.push({ ...insight });
      else existing.unlockPotential = Math.max(existing.unlockPotential, insight.unlockPotential);
      return result;
    }, [])
    .sort((a, b) => b.unlockPotential - a.unlockPotential)
    .slice(0, 6);

  if (looks.length < requestedLooks) warnings.push(`Built ${looks.length} of ${requestedLooks} requested distinct looks from the eligible wardrobe.`);
  if (unavailableItems.some((item) => item.reason === "needs_care")) warnings.push("Items marked as needing care were kept out of this plan.");

  return {
    type: input.type,
    title: input.title || defaultTitle(input.type, input.destination),
    status: looks.length === requestedLooks && looks.every((look) => look.completenessStatus === "complete") ? "ready" as const : "incomplete" as const,
    startDate: input.startDate || null,
    endDate: input.endDate || null,
    context: { occasions: input.occasions, days: requestedLooks, destination: input.destination || "", weatherContext: input.weatherContext || "" },
    looks,
    itemIds: allItemIds,
    packingList: input.type === "packing" || input.type === "capsule" ? packingList : [],
    underusedItemIds: underusedSelected,
    unavailableItems,
    gapInsights,
    warnings: Array.from(new Set(warnings)),
    wardrobeReadiness: wardrobeReadiness(eligible)
  };
}

export function serializeStylistPlan(plan: any) {
  return {
    id: String(plan._id),
    type: plan.type,
    title: plan.title,
    status: plan.status,
    startDate: plan.startDate ? new Date(plan.startDate).toISOString() : null,
    endDate: plan.endDate ? new Date(plan.endDate).toISOString() : null,
    context: plan.context || {},
    looks: plan.looks || [],
    itemIds: (plan.itemIds || []).map(String),
    packingList: plan.packingList || [],
    underusedItemIds: (plan.underusedItemIds || []).map(String),
    unavailableItems: plan.unavailableItems || [],
    gapInsights: plan.gapInsights || [],
    warnings: plan.warnings || [],
    createdAt: plan.createdAt ? new Date(plan.createdAt).toISOString() : null,
    updatedAt: plan.updatedAt ? new Date(plan.updatedAt).toISOString() : null
  };
}
