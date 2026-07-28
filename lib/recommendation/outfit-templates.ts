import { type OccasionProfile } from "@/lib/recommendation/occasion-profiles";
import { metadataValue } from "@/lib/recommendation/scoring";

export type OutfitTemplateId =
  | "casual"
  | "business_casual"
  | "dress"
  | "female_brunch"
  | "wedding"
  | "native"
  | "activewear"
  | "vacation_light"
  | "streetwear"
  | "formal";

export type OutfitTemplate = {
  id: OutfitTemplateId;
  label: string;
  stylingFamily: string;
  requiredCategories: string[];
  optionalCategories: string[];
  preferredTerms: string[];
  accessoryTerms: string[];
  hairEligible: boolean;
};

export const outfitTemplates: Record<OutfitTemplateId, OutfitTemplate> = {
  casual: {
    id: "casual",
    label: "Casual",
    stylingFamily: "top-bottom-casual",
    requiredCategories: ["tops", "bottoms", "shoes"],
    optionalCategories: ["bags", "accessories", "outerwear"],
    preferredTerms: ["tee", "t-shirt", "polo", "jeans", "chinos", "sneaker", "trainer"],
    accessoryTerms: ["watch", "crossbody", "tote", "cap"],
    hairEligible: false
  },
  business_casual: {
    id: "business_casual",
    label: "Business Casual",
    stylingFamily: "tailored-business",
    requiredCategories: ["tops", "bottoms", "shoes"],
    optionalCategories: ["outerwear", "bags", "accessories"],
    preferredTerms: ["shirt", "oxford", "blouse", "trouser", "pants", "chinos", "loafer", "belt", "watch", "briefcase", "tote", "blazer"],
    accessoryTerms: ["belt", "watch", "briefcase", "tote"],
    hairEligible: false
  },
  dress: {
    id: "dress",
    label: "Dress",
    stylingFamily: "one-piece-dress",
    requiredCategories: ["dresses", "shoes"],
    optionalCategories: ["bags", "accessories", "outerwear", "womens_hair"],
    preferredTerms: ["dress", "gown", "heel", "pump", "clutch", "shoulder bag", "necklace", "bracelet"],
    accessoryTerms: ["clutch", "necklace", "bracelet", "watch"],
    hairEligible: true
  },
  female_brunch: {
    id: "female_brunch",
    label: "Female Brunch",
    stylingFamily: "soft-polished-brunch",
    requiredCategories: ["dresses", "shoes"],
    optionalCategories: ["womens_hair", "bags", "accessories", "outerwear"],
    preferredTerms: ["dress", "skirt", "heel", "pump", "shoulder bag", "necklace", "bracelet", "hair", "wig", "braids"],
    accessoryTerms: ["shoulder bag", "necklace", "bracelet", "hair", "wig"],
    hairEligible: true
  },
  wedding: {
    id: "wedding",
    label: "Wedding",
    stylingFamily: "occasion-polish",
    requiredCategories: ["dresses", "tops", "bottoms", "shoes"],
    optionalCategories: ["outerwear", "bags", "accessories", "womens_hair"],
    preferredTerms: ["native", "agbada", "kaftan", "isiagu", "ankara", "dress", "gown", "formal shoe", "loafer", "heel", "watch", "cap"],
    accessoryTerms: ["watch", "cap", "clutch", "necklace", "hair"],
    hairEligible: true
  },
  native: {
    id: "native",
    label: "Native",
    stylingFamily: "traditional-polish",
    requiredCategories: ["dresses", "tops", "bottoms", "shoes"],
    optionalCategories: ["accessories", "bags", "womens_hair"],
    preferredTerms: ["native", "agbada", "kaftan", "isiagu", "ankara", "aso-ebi", "formal shoe", "loafer", "sandal", "cap"],
    accessoryTerms: ["watch", "cap", "clutch", "hair"],
    hairEligible: true
  },
  activewear: {
    id: "activewear",
    label: "Activewear",
    stylingFamily: "performance",
    requiredCategories: ["tops", "bottoms", "shoes"],
    optionalCategories: ["bags", "accessories", "outerwear"],
    preferredTerms: ["performance", "active", "gym", "sport", "legging", "shorts", "trainer", "sneaker", "duffel", "backpack"],
    accessoryTerms: ["backpack", "duffel", "smartwatch"],
    hairEligible: false
  },
  vacation_light: {
    id: "vacation_light",
    label: "Vacation",
    stylingFamily: "lightweight-travel",
    requiredCategories: ["tops", "bottoms", "shoes"],
    optionalCategories: ["bags", "accessories", "outerwear", "womens_hair"],
    preferredTerms: ["linen", "lightweight", "shorts", "sandal", "slides", "tote", "crossbody", "sunglasses", "hat"],
    accessoryTerms: ["tote", "crossbody", "sunglasses", "hat", "hair"],
    hairEligible: true
  },
  streetwear: {
    id: "streetwear",
    label: "Streetwear",
    stylingFamily: "streetwear",
    requiredCategories: ["tops", "bottoms", "shoes"],
    optionalCategories: ["bags", "accessories", "outerwear"],
    preferredTerms: ["oversized", "tee", "hoodie", "cargo", "jeans", "sneaker", "trainer", "cap", "crossbody"],
    accessoryTerms: ["cap", "crossbody", "watch"],
    hairEligible: false
  },
  formal: {
    id: "formal",
    label: "Formal",
    stylingFamily: "formal-polish",
    requiredCategories: ["dresses", "tops", "bottoms", "shoes"],
    optionalCategories: ["outerwear", "bags", "accessories", "womens_hair"],
    preferredTerms: ["dress", "gown", "shirt", "trouser", "blazer", "formal shoe", "loafer", "oxford", "heel", "clutch", "watch", "tie", "cufflink"],
    accessoryTerms: ["watch", "tie", "cufflink", "clutch", "necklace", "hair"],
    hairEligible: true
  }
};

function normalize(value: unknown) {
  return String(value || "").toLowerCase();
}

function itemText(item: any) {
  return [
    item?.name,
    item?.category,
    item?.subcategory,
    item?.garmentType,
    item?.fabric,
    item?.fit,
    metadataValue(item, "garmentType"),
    metadataValue(item, "subcategory"),
    metadataValue(item, "fabricEstimate"),
    metadataValue(item, "styleFamily")
  ].filter(Boolean).join(" ").toLowerCase();
}

function userAppearsFeminine(styleProfile?: any) {
  return /\b(female|woman|women|feminine|lady)\b/.test(normalize([
    styleProfile?.genderPresentation,
    styleProfile?.avatarBase,
    styleProfile?.bodyProfile,
    styleProfile?.styleWords?.join?.(" "),
    styleProfile?.notes?.join?.(" ")
  ].filter(Boolean).join(" ")));
}

export function selectOutfitTemplate(input: {
  occasionName?: string;
  occasionGroup?: string;
  recommendationMode?: string;
  styleProfile?: any;
  profile: OccasionProfile;
}): OutfitTemplate {
  const context = normalize([input.occasionName, input.occasionGroup, input.recommendationMode, input.profile.id].join(" "));

  if (/gym|workout|active|sport/.test(context)) return outfitTemplates.activewear;
  if (/streetwear|street|oversized|cargo/.test(context)) return outfitTemplates.streetwear;
  if (/vacation|holiday|beach|resort/.test(context)) return outfitTemplates.vacation_light;
  if (/native|traditional|cultural|agbada|kaftan|isiagu|ankara/.test(context)) return outfitTemplates.native;
  if (/wedding|aso[-\s]?ebi/.test(context)) return outfitTemplates.wedding;
  if (/business|work|office|interview|networking/.test(context)) return outfitTemplates.business_casual;
  if (/formal|gala|ceremony|black tie/.test(context)) return outfitTemplates.formal;
  if (/brunch/.test(context) && userAppearsFeminine(input.styleProfile)) return outfitTemplates.female_brunch;
  if (/date|dinner|birthday|church/.test(context) && userAppearsFeminine(input.styleProfile)) return outfitTemplates.dress;
  return outfitTemplates.casual;
}

export function templateCategories(template: OutfitTemplate) {
  return Array.from(new Set([...template.requiredCategories, ...template.optionalCategories]));
}

export function scoreItemForTemplate(item: any, template?: OutfitTemplate) {
  if (!template) return 0;
  const text = itemText(item);
  let score = 0;

  if (template.requiredCategories.includes(item.category)) score += 5;
  if (template.optionalCategories.includes(item.category)) score += 3;

  for (const term of template.preferredTerms) {
    if (text.includes(term.toLowerCase())) score += 5;
  }

  for (const term of template.accessoryTerms) {
    if (text.includes(term.toLowerCase())) score += 6;
  }

  if (item.category === "womens_hair") score += template.hairEligible ? 8 : -10;
  return score;
}
