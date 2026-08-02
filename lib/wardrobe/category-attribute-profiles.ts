import type { WardrobeCategory } from "@/types/wardrobe";
import type { AccessoryRole } from "@/lib/wardrobe/metadata-types";

export type CategoryAttributeProfile = {
  category: WardrobeCategory;
  label: string;
  promptFocus: string[];
  allowedSpecificFields: string[];
};

export const accessoryRoles: AccessoryRole[] = [
  "watch",
  "necklace",
  "bracelet",
  "earrings",
  "ring",
  "anklet",
  "belt",
  "scarf",
  "eyewear",
  "headwear",
  "gloves",
  "tie",
  "cufflinks",
  "pocket_square",
  "hair_accessory",
  "other"
];

export const categoryAttributeProfiles: Record<WardrobeCategory, CategoryAttributeProfile> = {
  tops: {
    category: "tops",
    label: "Tops",
    promptFocus: ["sleeve length", "collar", "neckline", "fit", "cut", "fabric weight", "transparency", "tuckability", "closure"],
    allowedSpecificFields: ["sleeveLength", "collarType", "neckline", "cuffType", "fit", "cut", "fabricWeight", "transparency", "tuckability", "closureType"]
  },
  bottoms: {
    category: "bottoms",
    label: "Bottoms",
    promptFocus: ["rise", "leg shape", "length", "waist type", "fit", "pleats", "stretch", "closure"],
    allowedSpecificFields: ["rise", "legShape", "length", "garmentLength", "waistType", "waistbandType", "beltCompatible", "fit", "pleats", "stretch", "closureType"]
  },
  dresses: {
    category: "dresses",
    label: "Dresses and one-pieces",
    promptFocus: ["silhouette", "neckline", "sleeve length", "hem length", "waist definition", "back style", "slit", "structure"],
    allowedSpecificFields: ["silhouette", "neckline", "sleeveLength", "hemLength", "garmentLength", "waistDefinition", "backStyle", "slit", "structure"]
  },
  native: {
    category: "native",
    label: "Native and traditional wear",
    promptFocus: ["garment type", "style context", "set components", "embroidery", "headwear compatibility", "footwear compatibility", "ceremonial level"],
    allowedSpecificFields: ["garmentType", "culturalStyle", "setComponents", "embroideryLevel", "headwearCompatibility", "footwearCompatibility", "ceremonialLevel"]
  },
  outerwear: {
    category: "outerwear",
    label: "Outerwear",
    promptFocus: ["layer type", "structure", "lapel", "length", "insulation", "weather protection", "closure", "formality range"],
    allowedSpecificFields: ["layerType", "structure", "lapelType", "hasLapel", "supportsPocketSquare", "length", "insulationLevel", "weatherProtection", "closureType", "formalityRange"]
  },
  shoes: {
    category: "shoes",
    label: "Shoes",
    promptFocus: ["shoe style", "toe shape", "heel type", "heel height", "sole", "fastening", "material finish", "activity", "comfort", "weather suitability"],
    allowedSpecificFields: ["shoeStyle", "toeShape", "toeStyle", "heelType", "heelHeight", "soleType", "fastening", "materialFinish", "activity", "activityType", "comfortLevel", "weatherSuitability", "trouserCompatibility", "dressCompatibility"]
  },
  bags: {
    category: "bags",
    label: "Bags",
    promptFocus: ["bag style", "size", "structure", "strap", "carrying style", "closure", "hardware finish", "capacity", "occasion range"],
    allowedSpecificFields: ["bagStyle", "size", "structure", "strapType", "carryingStyle", "closureType", "hardwareFinish", "capacity", "occasionRange"]
  },
  accessories: {
    category: "accessories",
    label: "Accessories",
    promptFocus: ["accessory role", "metal tone", "material", "scale", "statement level", "hardware", "belt/watch/jewelry/eyewear-specific details", "occasion range"],
    allowedSpecificFields: ["role", "metalTone", "material", "accessoryScale", "sizeScale", "statementLevel", "hardwareFinish", "wristType", "beltWidth", "buckleStyle", "lensType", "frameShape", "jewelleryLength", "occasionRange"]
  },
  womens_hair: {
    category: "womens_hair",
    label: "Women's Hair",
    promptFocus: ["hair type", "texture", "length", "colour family", "curl pattern", "density", "volume", "parting", "installation", "neckline compatibility", "occasion range"],
    allowedSpecificFields: ["hairType", "texture", "length", "colourFamily", "curlPattern", "density", "volume", "partingStyle", "installationType", "protectiveStyle", "updoCompatibility", "necklineCompatibility", "occasionRange", "formalityRange"]
  }
};

export function profileForCategory(category?: WardrobeCategory | string) {
  return categoryAttributeProfiles[String(category || "") as WardrobeCategory] || null;
}

export function specificFieldsForCategory(category?: WardrobeCategory | string) {
  return profileForCategory(category)?.allowedSpecificFields || [];
}
