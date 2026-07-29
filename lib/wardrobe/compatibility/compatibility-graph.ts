export { normalizeBrandSignal } from "@/lib/wardrobe/compatibility/brand-recognition";
export { analyseColourValue, colourHarmonyRelationship } from "@/lib/wardrobe/compatibility/colour-analysis";
export { analyseMaterialValue, materialRelationship } from "@/lib/wardrobe/compatibility/material-analysis";
export { detectLikelyDuplicate } from "@/lib/wardrobe/compatibility/duplicate-detection";
export { buildImageQualityIntelligence, mergeUploadIntelligence, type UploadIntelligence } from "@/lib/wardrobe/compatibility/image-quality";
export { scoreCompatibilityGraph, scoreItemCompatibility, type CompatibilityEdgeInput, type CompatibilityRelationshipType } from "@/lib/wardrobe/compatibility/compatibility-score";
export { buildCompatibilityEdgesForItem, refreshCompatibilityGraphForItem } from "@/lib/wardrobe/compatibility/graph-builder";
export { getCompatibilityEdgesForItems, upsertCompatibilityEdges } from "@/lib/wardrobe/compatibility/graph-storage";
