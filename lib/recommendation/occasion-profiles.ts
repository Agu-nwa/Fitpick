import { accessoryRoleFor, type AccessoryRole } from "@/lib/recommendation/accessory-completion";
import { metadataList, metadataValue } from "@/lib/recommendation/scoring";

export type OccasionProfileId =
  | "business"
  | "interview"
  | "wedding"
  | "church"
  | "vacation"
  | "airport"
  | "gym"
  | "networking"
  | "date_night"
  | "birthday"
  | "dinner"
  | "smart_casual"
  | "formal_event"
  | "traditional_event"
  | "everyday";

export type OccasionProfile = {
  id: OccasionProfileId;
  label: string;
  patterns: RegExp[];
  formality: "relaxed" | "balanced" | "polished" | "formal";
  preferredFootwear: string[];
  preferredColors: string[];
  preferredLayers: string[];
  preferredBags: string[];
  preferredAccessoryRoles: AccessoryRole[];
  avoidAccessoryRoles?: AccessoryRole[];
  hairEligible: boolean;
  risk: "restrained" | "balanced" | "expressive";
};

export const occasionProfiles: OccasionProfile[] = [
  {
    id: "business",
    label: "Business",
    patterns: [/business|work|office|meeting|corporate/],
    formality: "polished",
    preferredFootwear: ["loafer", "oxford", "derby", "formal shoe", "heel", "pump"],
    preferredColors: ["black", "navy", "white", "grey", "gray", "brown", "cream"],
    preferredLayers: ["blazer", "jacket", "coat"],
    preferredBags: ["briefcase", "tote", "structured bag", "satchel"],
    preferredAccessoryRoles: ["waist", "wrist", "carry"],
    avoidAccessoryRoles: ["head"],
    hairEligible: false,
    risk: "restrained"
  },
  {
    id: "interview",
    label: "Interview",
    patterns: [/interview/],
    formality: "formal",
    preferredFootwear: ["loafer", "oxford", "derby", "formal shoe", "heel", "pump"],
    preferredColors: ["black", "navy", "white", "grey", "gray", "cream"],
    preferredLayers: ["blazer", "jacket"],
    preferredBags: ["briefcase", "tote", "structured bag"],
    preferredAccessoryRoles: ["waist", "wrist", "carry"],
    avoidAccessoryRoles: ["head", "face"],
    hairEligible: false,
    risk: "restrained"
  },
  {
    id: "wedding",
    label: "Wedding",
    patterns: [/wedding|aso[-\s]?ebi|guest ready/],
    formality: "formal",
    preferredFootwear: ["formal shoe", "loafer", "heel", "pump", "dress shoe"],
    preferredColors: ["cream", "black", "navy", "gold", "silver", "white"],
    preferredLayers: ["blazer", "coat", "shawl"],
    preferredBags: ["clutch", "shoulder bag", "tote"],
    preferredAccessoryRoles: ["wrist", "carry", "neck", "formal-detail", "head", "hair"],
    hairEligible: true,
    risk: "expressive"
  },
  {
    id: "church",
    label: "Church",
    patterns: [/church|sunday/],
    formality: "polished",
    preferredFootwear: ["loafer", "formal shoe", "heel", "pump", "boot"],
    preferredColors: ["white", "cream", "black", "navy", "brown", "grey", "gray"],
    preferredLayers: ["blazer", "cardigan", "coat"],
    preferredBags: ["handbag", "tote", "shoulder bag"],
    preferredAccessoryRoles: ["wrist", "carry", "neck", "hair"],
    hairEligible: true,
    risk: "restrained"
  },
  {
    id: "vacation",
    label: "Vacation",
    patterns: [/vacation|holiday|resort|beach/],
    formality: "relaxed",
    preferredFootwear: ["sandal", "slides", "sneaker", "espadrille"],
    preferredColors: ["white", "cream", "blue", "tan", "green", "yellow"],
    preferredLayers: ["linen shirt", "light jacket", "overshirt"],
    preferredBags: ["tote", "crossbody", "backpack"],
    preferredAccessoryRoles: ["carry", "face", "head", "hair"],
    hairEligible: true,
    risk: "balanced"
  },
  {
    id: "airport",
    label: "Airport",
    patterns: [/airport|flight|travel/],
    formality: "balanced",
    preferredFootwear: ["sneaker", "trainer", "loafer"],
    preferredColors: ["black", "grey", "gray", "navy", "cream", "white"],
    preferredLayers: ["jacket", "cardigan", "hoodie", "overshirt"],
    preferredBags: ["backpack", "crossbody", "tote"],
    preferredAccessoryRoles: ["carry", "wrist", "head"],
    hairEligible: false,
    risk: "balanced"
  },
  {
    id: "gym",
    label: "Gym",
    patterns: [/gym|workout|training|sport|active/],
    formality: "relaxed",
    preferredFootwear: ["trainer", "sneaker", "sports shoe"],
    preferredColors: ["black", "grey", "gray", "white", "blue"],
    preferredLayers: ["hoodie", "track jacket"],
    preferredBags: ["backpack", "duffel"],
    preferredAccessoryRoles: ["carry", "wrist"],
    avoidAccessoryRoles: ["neck", "formal-detail"],
    hairEligible: false,
    risk: "balanced"
  },
  {
    id: "networking",
    label: "Networking",
    patterns: [/networking|conference|professional/],
    formality: "polished",
    preferredFootwear: ["loafer", "formal shoe", "heel", "pump"],
    preferredColors: ["black", "navy", "white", "cream", "grey", "gray"],
    preferredLayers: ["blazer", "jacket"],
    preferredBags: ["briefcase", "tote", "structured bag"],
    preferredAccessoryRoles: ["waist", "wrist", "carry"],
    hairEligible: false,
    risk: "restrained"
  },
  {
    id: "date_night",
    label: "Date Night",
    patterns: [/date|romantic/],
    formality: "polished",
    preferredFootwear: ["boot", "loafer", "heel", "pump", "formal shoe"],
    preferredColors: ["black", "white", "cream", "red", "brown", "navy"],
    preferredLayers: ["jacket", "blazer", "coat"],
    preferredBags: ["clutch", "shoulder bag", "crossbody"],
    preferredAccessoryRoles: ["wrist", "carry", "neck", "hair"],
    hairEligible: true,
    risk: "balanced"
  },
  {
    id: "birthday",
    label: "Birthday",
    patterns: [/birthday|party|celebration/],
    formality: "polished",
    preferredFootwear: ["heel", "boot", "loafer", "sneaker", "formal shoe"],
    preferredColors: ["black", "white", "gold", "silver", "red", "blue"],
    preferredLayers: ["jacket", "blazer"],
    preferredBags: ["clutch", "shoulder bag", "crossbody"],
    preferredAccessoryRoles: ["wrist", "carry", "neck", "face", "hair"],
    hairEligible: true,
    risk: "expressive"
  },
  {
    id: "dinner",
    label: "Dinner",
    patterns: [/dinner|evening/],
    formality: "polished",
    preferredFootwear: ["boot", "loafer", "heel", "pump", "formal shoe"],
    preferredColors: ["black", "white", "cream", "navy", "brown", "red"],
    preferredLayers: ["jacket", "blazer", "coat"],
    preferredBags: ["clutch", "shoulder bag", "crossbody"],
    preferredAccessoryRoles: ["wrist", "carry", "neck", "hair"],
    hairEligible: true,
    risk: "balanced"
  },
  {
    id: "smart_casual",
    label: "Smart Casual",
    patterns: [/smart casual|polished casual/],
    formality: "balanced",
    preferredFootwear: ["loafer", "sneaker", "boot"],
    preferredColors: ["black", "white", "cream", "navy", "brown", "green"],
    preferredLayers: ["jacket", "blazer", "overshirt"],
    preferredBags: ["tote", "crossbody", "shoulder bag"],
    preferredAccessoryRoles: ["wrist", "carry", "waist"],
    hairEligible: false,
    risk: "balanced"
  },
  {
    id: "formal_event",
    label: "Formal Event",
    patterns: [/formal|gala|black tie|ceremony/],
    formality: "formal",
    preferredFootwear: ["formal shoe", "oxford", "derby", "heel", "pump"],
    preferredColors: ["black", "white", "cream", "navy", "silver", "gold"],
    preferredLayers: ["blazer", "coat", "shawl"],
    preferredBags: ["clutch", "structured bag"],
    preferredAccessoryRoles: ["wrist", "carry", "neck", "formal-detail", "hair"],
    hairEligible: true,
    risk: "restrained"
  },
  {
    id: "traditional_event",
    label: "Traditional Event",
    patterns: [/traditional|native|cultural|agbada|kaftan|isiagu|ankara/],
    formality: "formal",
    preferredFootwear: ["formal shoe", "loafer", "sandal"],
    preferredColors: ["black", "white", "cream", "gold", "brown", "navy"],
    preferredLayers: ["native", "agbada", "kaftan", "isiagu"],
    preferredBags: ["clutch", "tote"],
    preferredAccessoryRoles: ["wrist", "head", "carry", "hair"],
    hairEligible: true,
    risk: "balanced"
  },
  {
    id: "everyday",
    label: "Everyday",
    patterns: [/casual|weekend|today|everyday|streetwear|off[-\s]?duty/],
    formality: "balanced",
    preferredFootwear: ["sneaker", "trainer", "boot", "sandal"],
    preferredColors: ["black", "white", "cream", "blue", "green", "grey", "gray"],
    preferredLayers: ["jacket", "hoodie", "overshirt"],
    preferredBags: ["crossbody", "tote", "backpack"],
    preferredAccessoryRoles: ["wrist", "carry", "head", "face"],
    hairEligible: false,
    risk: "balanced"
  }
];

function normalizedContext(input: { occasionName?: string; occasionGroup?: string; weatherContext?: string; recommendationMode?: string }) {
  return [
    input.occasionName,
    input.occasionGroup,
    input.weatherContext,
    input.recommendationMode
  ].filter(Boolean).join(" ").toLowerCase();
}

function textForItem(item: any) {
  return [
    item?.name,
    item?.category,
    item?.subcategory,
    item?.garmentType,
    item?.brand,
    item?.color,
    item?.fabric,
    metadataValue(item, "garmentType"),
    metadataValue(item, "subcategory"),
    metadataValue(item, "fabricEstimate"),
    metadataList(item, "occasionSuitability").join(" "),
    metadataList(item, "formalityScore").join(" ")
  ].filter(Boolean).join(" ").toLowerCase();
}

function containsAny(text: string, values: string[] = []) {
  return values.some((value) => {
    const normalized = value.toLowerCase();
    return normalized && text.includes(normalized);
  });
}

export function resolveOccasionProfile(input: {
  occasionName?: string;
  occasionGroup?: string;
  weatherContext?: string;
  recommendationMode?: string;
}): OccasionProfile {
  const context = normalizedContext(input);
  if (/wedding|aso[-\s]?ebi/.test(context)) return occasionProfiles.find((profile) => profile.id === "wedding")!;
  if (/formal|gala|black tie|ceremony/.test(context)) return occasionProfiles.find((profile) => profile.id === "formal_event")!;

  return occasionProfiles.find((profile) => profile.patterns.some((pattern) => pattern.test(context))) ||
    occasionProfiles.find((profile) => profile.id === "everyday")!;
}

export function scoreItemForOccasionProfile(item: any, profile: OccasionProfile) {
  const text = textForItem(item);
  let score = 0;

  if (item.category === "shoes" && containsAny(text, profile.preferredFootwear)) score += 11;
  if (item.category === "outerwear" && containsAny(text, profile.preferredLayers)) score += 8;
  if (item.category === "bags" && containsAny(text, profile.preferredBags)) score += 10;
  if (containsAny(text, profile.preferredColors)) score += profile.risk === "restrained" ? 5 : 3;

  if (item.category === "accessories" || item.category === "bags" || item.category === "womens_hair") {
    const role = accessoryRoleFor(item);
    if (profile.preferredAccessoryRoles.includes(role)) score += 8;
    if (profile.avoidAccessoryRoles?.includes(role)) score -= 12;
    if (role === "hair" && !profile.hairEligible) score -= 8;
  }

  if (profile.formality === "formal" && /\b(sneaker|trainer|hoodie|cap|backpack)\b/.test(text)) score -= 8;
  if (profile.formality === "relaxed" && /\b(cufflink|pocket square|bow tie)\b/.test(text)) score -= 8;

  return score;
}
