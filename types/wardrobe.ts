export type WardrobeCondition = "ready" | "needs-care" | "missing-tags";

export type WardrobeItem = {
  id: string;
  name: string;
  category: "tops" | "bottoms" | "dresses" | "native" | "outerwear" | "shoes" | "bags" | "accessories";
  color: string;
  pattern?: string;
  formality: string[];
  occasions: string[];
  weather: string[];
  condition: WardrobeCondition;
  lastWorn?: string;
  imageTone: string;
};
