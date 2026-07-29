import type { WardrobeCategory } from "@/types/wardrobe";

export type AccessoryRole =
  | "watch"
  | "necklace"
  | "bracelet"
  | "earrings"
  | "ring"
  | "anklet"
  | "belt"
  | "scarf"
  | "eyewear"
  | "headwear"
  | "gloves"
  | "tie"
  | "cufflinks"
  | "pocket_square"
  | "hair_accessory"
  | "other";

export type UniversalItemMetadata = {
  category: WardrobeCategory;
  subtype: string;
  primaryColor: string;
  secondaryColors?: string[];
  brand?: string;
  pattern?: string;
  material?: string;
  fabric?: string;
  fit?: string;
  formality?: string;
  occasions?: string[];
  seasons?: string[];
  weatherSuitability?: string[];
  styleTags?: string[];
  genderSuitability?: string[];
  confidence?: Record<string, number>;
};

export type CategorySpecificMetadata = Record<string, string | string[] | boolean | null>;

export type NormalisedWardrobeItemMetadata = {
  universal: UniversalItemMetadata;
  specific: CategorySpecificMetadata;
  confidence: Record<string, number>;
  source: "structured" | "legacy" | "mixed";
};
