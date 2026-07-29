import { WardrobeItem } from "@/models/WardrobeItem";
import { scoreItemCompatibility } from "@/lib/wardrobe/compatibility/compatibility-score";
import { upsertCompatibilityEdges } from "@/lib/wardrobe/compatibility/graph-storage";

function idFor(item: any) {
  return String(item?._id || item?.id || "");
}

export function buildCompatibilityEdgesForItem(input: {
  userId: string;
  item: any;
  wardrobeItems: any[];
  weatherContext?: string;
}) {
  const sourceId = idFor(input.item);
  const edges = [];
  for (const target of input.wardrobeItems || []) {
    const targetId = idFor(target);
    if (!targetId || targetId === sourceId) continue;
    const forward = scoreItemCompatibility({
      userId: input.userId,
      sourceItem: input.item,
      targetItem: target,
      weatherContext: input.weatherContext
    });
    const reverse = scoreItemCompatibility({
      userId: input.userId,
      sourceItem: target,
      targetItem: input.item,
      weatherContext: input.weatherContext
    });
    edges.push(forward, reverse);
  }
  return edges;
}

export async function refreshCompatibilityGraphForItem(input: {
  userId: string;
  wardrobeItemId: string;
}) {
  const item = await WardrobeItem.findOne({
    _id: input.wardrobeItemId,
    userId: input.userId,
    archivedAt: null
  }).lean();
  if (!item) return { refreshed: 0 };

  const wardrobeItems = await WardrobeItem.find({
    userId: input.userId,
    archivedAt: null,
    _id: { $ne: input.wardrobeItemId }
  })
    .limit(500)
    .lean();

  const edges = buildCompatibilityEdgesForItem({
    userId: input.userId,
    item,
    wardrobeItems
  });
  const result = await upsertCompatibilityEdges(edges);

  return {
    refreshed: result.upserted,
    wardrobeItemId: input.wardrobeItemId
  };
}
