import { WardrobeCompatibilityEdge } from "@/models/WardrobeCompatibilityEdge";
import type { CompatibilityEdgeInput } from "@/lib/wardrobe/compatibility/compatibility-score";

function uniqueEdges(edges: CompatibilityEdgeInput[]) {
  const seen = new Set<string>();
  const result: CompatibilityEdgeInput[] = [];
  for (const edge of edges) {
    if (!edge.sourceItemId || !edge.targetItemId || edge.sourceItemId === edge.targetItemId) continue;
    const key = `${edge.userId}:${edge.sourceItemId}:${edge.targetItemId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(edge);
  }
  return result;
}

export async function upsertCompatibilityEdges(edges: CompatibilityEdgeInput[]) {
  const cleanEdges = uniqueEdges(edges);
  if (!cleanEdges.length) return { upserted: 0 };

  await WardrobeCompatibilityEdge.bulkWrite(
    cleanEdges.map((edge) => ({
      updateOne: {
        filter: {
          userId: edge.userId,
          sourceItemId: edge.sourceItemId,
          targetItemId: edge.targetItemId
        },
        update: {
          $set: {
            score: edge.score,
            relationshipTypes: edge.relationshipTypes,
            reasons: edge.reasons,
            confidence: edge.confidence,
            source: edge.source,
            metadata: edge.metadata || {}
          }
        },
        upsert: true
      }
    })),
    { ordered: false }
  );

  return { upserted: cleanEdges.length };
}

export async function getCompatibilityEdgesForItems(input: {
  userId: string;
  itemIds: string[];
  minScore?: number;
}) {
  const ids = Array.from(new Set(input.itemIds.map(String).filter(Boolean)));
  if (ids.length < 2) return [];

  return WardrobeCompatibilityEdge.find({
    userId: input.userId,
    sourceItemId: { $in: ids },
    targetItemId: { $in: ids },
    score: { $gte: input.minScore ?? 0 }
  }).lean();
}
