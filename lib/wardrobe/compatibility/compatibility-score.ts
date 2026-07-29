import { metadataList, metadataValue } from "@/lib/recommendation/scoring";
import { categoryToOutfitSlot, normalizeOutfitSlot } from "@/lib/recommendation/outfit-slots";
import { colourHarmonyRelationship } from "@/lib/wardrobe/compatibility/colour-analysis";
import { materialRelationship } from "@/lib/wardrobe/compatibility/material-analysis";

export type CompatibilityRelationshipType =
  | "colour_harmony"
  | "occasion_match"
  | "material_match"
  | "silhouette_match"
  | "accessory_match"
  | "layer_match"
  | "season_match"
  | "weather_match"
  | "historical_success";

export type CompatibilityEdgeInput = {
  userId: string;
  sourceItemId: string;
  targetItemId: string;
  score: number;
  relationshipTypes: CompatibilityRelationshipType[];
  reasons: string[];
  confidence: number;
  source: "fashion_rules" | "ai" | "user_history" | "recommendation_engine" | "system";
  metadata?: Record<string, unknown>;
};

function clean(value: unknown) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function idFor(item: any) {
  return String(item?._id || item?.id || "");
}

function hasOverlap(left: string[], right: string[]) {
  const rightSet = new Set(right.map(clean).filter(Boolean));
  return left.map(clean).filter(Boolean).some((entry) => {
    if (rightSet.has(entry)) return true;
    return Array.from(rightSet).some((candidate) => candidate.includes(entry) || entry.includes(candidate));
  });
}

function itemMaterial(item: any) {
  return metadataValue(item, "fabricComposition") ||
    metadataValue(item, "fabricEstimate") ||
    item.fabric ||
    metadataValue(item, "material");
}

function itemSilhouette(item: any) {
  return metadataValue(item, "silhouette") || metadataValue(item, "fit") || item.fit || item.garmentFit;
}

function isAccessoryLike(item: any) {
  return ["accessories", "bags", "womens_hair"].includes(clean(item.category));
}

function slotFor(item: any) {
  return normalizeOutfitSlot(item) || categoryToOutfitSlot(item.category || "");
}

export function scoreItemCompatibility(input: {
  userId: string;
  sourceItem: any;
  targetItem: any;
  weatherContext?: string;
}) {
  const sourceId = idFor(input.sourceItem);
  const targetId = idFor(input.targetItem);
  const relationshipTypes: CompatibilityRelationshipType[] = [];
  const reasons: string[] = [];
  let score = 12;
  let evidence = 0;

  const colour = colourHarmonyRelationship(
    metadataValue(input.sourceItem, "primaryColor") || input.sourceItem.color,
    metadataValue(input.targetItem, "primaryColor") || input.targetItem.color
  );
  score += colour.score;
  if (colour.reason) {
    relationshipTypes.push("colour_harmony");
    reasons.push(colour.reason);
    evidence += colour.confidence;
  }

  const sourceOccasions = metadataList(input.sourceItem, "occasionSuitability").concat(input.sourceItem.occasions || []);
  const targetOccasions = metadataList(input.targetItem, "occasionSuitability").concat(input.targetItem.occasions || []);
  if (hasOverlap(sourceOccasions, targetOccasions)) {
    score += 14;
    relationshipTypes.push("occasion_match");
    reasons.push("Occasion tags overlap.");
    evidence += 0.75;
  }

  const sourceWeather = metadataList(input.sourceItem, "weatherSuitability").concat(input.sourceItem.weather || []);
  const targetWeather = metadataList(input.targetItem, "weatherSuitability").concat(input.targetItem.weather || []);
  if (hasOverlap(sourceWeather, targetWeather)) {
    score += 12;
    relationshipTypes.push("weather_match");
    reasons.push("Weather tags are compatible.");
    evidence += 0.7;
  }

  const sourceSeasons = metadataList(input.sourceItem, "seasonSuitability");
  const targetSeasons = metadataList(input.targetItem, "seasonSuitability");
  if (sourceSeasons.length && targetSeasons.length && hasOverlap(sourceSeasons, targetSeasons)) {
    score += 8;
    relationshipTypes.push("season_match");
    reasons.push("Season suitability overlaps.");
    evidence += 0.65;
  }

  const material = materialRelationship(itemMaterial(input.sourceItem), itemMaterial(input.targetItem), input.weatherContext);
  score += material.score;
  if (material.reason) {
    relationshipTypes.push("material_match");
    reasons.push(material.reason);
    evidence += material.confidence;
  }

  const sourceSilhouette = clean(itemSilhouette(input.sourceItem));
  const targetSilhouette = clean(itemSilhouette(input.targetItem));
  if (sourceSilhouette && targetSilhouette) {
    const hasStructure = /tailored|structured|slim|straight|fitted/.test(`${sourceSilhouette} ${targetSilhouette}`);
    const hasVolume = /wide|flowy|oversized|relaxed|voluminous/.test(`${sourceSilhouette} ${targetSilhouette}`);
    if (hasStructure || hasVolume) {
      score += hasStructure && hasVolume ? 14 : 9;
      relationshipTypes.push("silhouette_match");
      reasons.push(hasStructure && hasVolume ? "Silhouettes balance structure and ease." : "Silhouettes sit in a wearable proportion family.");
      evidence += 0.65;
    }
  }

  const sourceSlot = slotFor(input.sourceItem);
  const targetSlot = slotFor(input.targetItem);
  const slots = new Set([sourceSlot, targetSlot]);
  if (slots.has("top") && slots.has("bottom")) {
    score += 12;
    relationshipTypes.push("silhouette_match");
    reasons.push("Top and bottom roles complete the outfit base.");
    evidence += 0.7;
  }
  if (slots.has("outerwear") && (slots.has("top") || slots.has("onePiece"))) {
    score += 10;
    relationshipTypes.push("layer_match");
    reasons.push("Layering roles are compatible.");
    evidence += 0.65;
  }
  if ((sourceSlot === "shoes" && targetSlot !== "shoes") || (targetSlot === "shoes" && sourceSlot !== "shoes")) {
    score += 8;
    relationshipTypes.push("accessory_match");
    reasons.push("Footwear supports the outfit structure.");
    evidence += 0.55;
  }
  if (isAccessoryLike(input.sourceItem) !== isAccessoryLike(input.targetItem)) {
    score += 7;
    relationshipTypes.push("accessory_match");
    reasons.push("Finishing piece supports the main outfit.");
    evidence += 0.55;
  }

  const uniqueTypes = Array.from(new Set(relationshipTypes));
  const confidence = Math.max(0.2, Math.min(1, evidence / Math.max(2, uniqueTypes.length + 1)));

  return {
    userId: input.userId,
    sourceItemId: sourceId,
    targetItemId: targetId,
    score: Math.max(0, Math.min(100, Math.round(score))),
    relationshipTypes: uniqueTypes,
    reasons: Array.from(new Set(reasons)).slice(0, 8),
    confidence: Math.round(confidence * 100) / 100,
    source: "fashion_rules" as const,
    metadata: {
      version: "compatibility-v1",
      sourceCategory: input.sourceItem.category || "",
      targetCategory: input.targetItem.category || ""
    }
  };
}

export function scoreCompatibilityGraph(items: any[], edges: any[] = []) {
  const ids = new Set(items.map(idFor).filter(Boolean));
  if (ids.size < 2 || !edges.length) {
    return {
      score: 0,
      edgeCount: 0,
      relationshipTypes: [],
      averageCompatibility: 0
    };
  }

  const relevant = edges.filter((edge) => {
    const source = String(edge.sourceItemId || "");
    const target = String(edge.targetItemId || "");
    return ids.has(source) && ids.has(target) && source !== target;
  });
  if (!relevant.length) {
    return {
      score: 0,
      edgeCount: 0,
      relationshipTypes: [],
      averageCompatibility: 0
    };
  }

  const average = relevant.reduce((sum, edge) => sum + Number(edge.score || 0), 0) / relevant.length;
  const confidence = relevant.reduce((sum, edge) => sum + Number(edge.confidence || 0), 0) / relevant.length;
  const relationshipTypes = Array.from(new Set(relevant.flatMap((edge) => edge.relationshipTypes || []))).slice(0, 10);
  const normalized = Math.round(((average - 50) / 10) * Math.max(0.35, confidence) * 10) / 10;

  return {
    score: Math.max(-8, Math.min(12, normalized)),
    edgeCount: relevant.length,
    relationshipTypes,
    averageCompatibility: Math.round(average)
  };
}
