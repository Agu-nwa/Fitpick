export const accessorySubtypeValues = [
  "watch", "necklace", "bracelet", "bangle", "cuff", "earrings", "ring", "anklet", "brooch", "pendant",
  "belt", "scarf", "tie", "pocket-square", "gloves", "hat", "sunglasses", "hair-accessory", "other"
] as const;

export type AccessorySubtype = (typeof accessorySubtypeValues)[number];
export type AccessorySubtypeConfidence = "authoritative" | "high" | "ambiguous" | "unresolved";

export type AccessorySubtypeResolution = {
  subtype: AccessorySubtype | null;
  confidence: AccessorySubtypeConfidence;
  source: "canonical" | "saved-subtype" | "garment-type" | "verified-ai" | "name" | "legacy-metadata" | "none";
};

type WardrobeLike = Record<string, unknown>;

const subtypeSet = new Set<string>(accessorySubtypeValues);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function scalar(value: unknown) {
  if (typeof value === "string") return value;
  const valueRecord = record(value);
  return typeof valueRecord.value === "string" ? valueRecord.value : "";
}

function canonical(value: unknown): AccessorySubtype | null {
  const normalized = scalar(value).trim().toLowerCase().replace(/_/g, "-");
  if (normalized === "watches") return "watch";
  if (normalized === "hair-accessories") return "hair-accessory";
  return subtypeSet.has(normalized) ? normalized as AccessorySubtype : null;
}

function inferFromText(text: string): AccessorySubtype | null {
  const normalized = text.toLowerCase();
  const rules: Array<[AccessorySubtype, RegExp]> = [
    ["watch", /\b(wristwatch|smartwatch|watch(?:es)?)\b/],
    ["earrings", /\b(earrings?|ear studs?|stud earrings?|hoop earrings?)\b/],
    ["bangle", /\bbangles?\b/],
    ["bracelet", /\bbracelets?\b/],
    ["cuff", /\b(wrist )?cuffs?\b/],
    ["anklet", /\banklets?\b/],
    ["brooch", /\b(brooch(?:es)?|lapel pin)\b/],
    ["pendant", /\bpendants?\b/],
    ["necklace", /\b(necklaces?|chokers?|chains?)\b/],
    ["ring", /\brings?\b/],
    ["pocket-square", /\bpocket[ -]?squares?\b/],
    ["hair-accessory", /\b(hair clips?|headbands?|hair pins?|hair combs?)\b/],
    ["belt", /\bbelts?\b/],
    ["scarf", /\b(scarves|scarf)\b/],
    ["tie", /\b(bow[ -]?ties|neckties?|ties)\b/],
    ["gloves", /\bgloves?\b/],
    ["sunglasses", /\b(sunglasses|shades|eyewear)\b/],
    ["hat", /\b(hats?|caps?|beanies?|fascinators?)\b/]
  ];
  return rules.find(([, pattern]) => pattern.test(normalized))?.[0] || null;
}

export function accessorySubtypeForIntakeId(id: string): AccessorySubtype | null {
  const mapping: Record<string, AccessorySubtype> = {
    watches: "watch", necklaces: "necklace", bracelets: "bracelet", bangles: "bangle", cuffs: "cuff",
    earrings: "earrings", rings: "ring", anklets: "anklet", brooches: "brooch", pendants: "pendant",
    belts: "belt", scarves: "scarf", ties: "tie", pocket_squares: "pocket-square", gloves: "gloves",
    hats: "hat", sunglasses: "sunglasses", hair_accessories: "hair-accessory", other_accessory: "other"
  };
  return mapping[id] || null;
}

export function resolveAccessorySubtype(item: WardrobeLike): AccessorySubtypeResolution {
  if (String(item.category || "") !== "accessories") return { subtype: null, confidence: "unresolved", source: "none" };
  const direct = canonical(item.accessorySubtype);
  if (direct) return { subtype: direct, confidence: "authoritative", source: "canonical" };

  const userInput = record(item.userInputMetadata);
  const categoryMetadata = record(item.categorySpecificMetadata);
  const recommendation = record(item.recommendationMetadata);
  const verified = record(item.verifiedMetadata);
  const analysis = record(item.aiAnalysis);
  const fields = record(analysis.fields);

  const sources: Array<[AccessorySubtypeResolution["source"], string, AccessorySubtypeConfidence]> = [
    ["saved-subtype", [scalar(item.subcategory), scalar(userInput.accessorySubtype), scalar(userInput.categoryId)].join(" "), "high"],
    ["garment-type", [scalar(item.garmentType), scalar(verified.garmentType)].join(" "), "high"],
    ["verified-ai", [scalar(verified.accessorySubtype), scalar(verified.recognizedEntity), scalar(fields.accessorySubtype), scalar(fields.garmentType)].join(" "), "high"],
    ["name", scalar(item.name), "high"],
    ["legacy-metadata", [scalar(item.description), scalar(categoryMetadata.subtype), scalar(recommendation.outfitRoleHint)].join(" "), "ambiguous"]
  ];
  for (const [source, text, confidence] of sources) {
    const inferred = inferFromText(text);
    if (inferred) return { subtype: inferred, confidence, source };
  }
  const genericJewelry = /\b(jewelry|jewellery|accessory|accessories)\b/i.test([scalar(item.name), scalar(item.subcategory)].join(" "));
  return { subtype: null, confidence: genericJewelry ? "ambiguous" : "unresolved", source: "none" };
}

export function accessorySubtypeFor(item: WardrobeLike) {
  return resolveAccessorySubtype(item).subtype;
}
