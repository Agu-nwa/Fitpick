type AttributeContext = {
  occasionName?: string;
  formality?: string;
  weatherContext?: string;
  styleProfile?: any;
};

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(normalize).filter(Boolean);
  if (typeof value === "string") return value.split(",").map(normalize).filter(Boolean);
  return [];
}

function value(item: any, key: string): any {
  const candidates = [
    item?.normalisedMetadata?.specific?.[key],
    item?.recommendationMetadata?.specific?.[key],
    item?.normalisedMetadata?.universal?.[key],
    item?.recommendationMetadata?.universal?.[key],
    item?.categorySpecificMetadata?.inferred?.[key],
    item?.categorySpecificMetadata?.[key],
    item?.verifiedMetadata?.[key]?.value,
    item?.aiAnalysis?.fields?.[key]?.value,
    item?.[key]
  ];
  return candidates.find((candidate) => candidate !== undefined && candidate !== null && candidate !== "");
}

function itemText(item: any) {
  return [
    item?.name,
    item?.category,
    item?.subcategory,
    item?.canonicalSubtype,
    item?.garmentType,
    item?.fabric,
    value(item, "garmentType"),
    value(item, "fabricEstimate"),
    value(item, "material"),
    value(item, "role"),
    value(item, "metalTone"),
    value(item, "hardwareFinish")
  ].filter(Boolean).join(" ").toLowerCase();
}

function contextText(context: AttributeContext) {
  return [context.occasionName, context.formality, context.weatherContext].filter(Boolean).join(" ").toLowerCase();
}

function known(valueToNormalize: unknown) {
  const normalized = normalize(valueToNormalize);
  return normalized && normalized !== "unknown" ? normalized : "";
}

function neckline(item: any) {
  const explicit = known(value(item, "neckline"));
  if (explicit) return explicit;
  const text = itemText(item);
  if (/v[-\s]?neck/.test(text)) return "v_neck";
  if (/scoop/.test(text)) return "scoop";
  if (/strapless|tube\s?top/.test(text)) return "strapless";
  if (/sweetheart/.test(text)) return "sweetheart";
  if (/turtleneck|mock[-\s]?neck|high[-\s]?neck/.test(text)) return "high_neck";
  if (/collared|button[-\s]?(?:up|down)|dress\s?shirt/.test(text)) return "collared";
  return "";
}

function accessoryRole(item: any) {
  const explicit = known(value(item, "stylingRole") || value(item, "role"));
  if (explicit) return explicit;
  const text = itemText(item);
  if (/necklace|pendant|chain/.test(text)) return "neck_jewelry";
  if (/earring/.test(text)) return "ear_jewelry";
  if (/watch|smartwatch/.test(text)) return "watch";
  if (/bracelet|bangle/.test(text)) return "wrist_jewelry";
  if (/belt/.test(text)) return "waist";
  if (/cufflinks?|pocket\s?square|tie\s?clip|lapel\s?pin/.test(text)) return "formal_detail";
  if (/handbag|tote|crossbody|clutch|backpack|purse|bag/.test(text)) return "carry";
  return "";
}

function metalTone(item: any) {
  const explicit = known(value(item, "metalTone") || value(item, "hardwareFinish"));
  if (explicit) return explicit;
  const text = itemText(item);
  if (/rose[-\s]?gold/.test(text)) return "rose_gold";
  if (/gold/.test(text)) return "gold";
  if (/silver|platinum/.test(text)) return "silver";
  if (/gunmetal|black\s+metal/.test(text)) return "gunmetal";
  return "";
}

function scale(item: any) {
  const explicit = known(value(item, "accessoryScale") || value(item, "visualWeight") || value(item, "statementLevel"));
  if (explicit) return explicit;
  const text = itemText(item);
  if (/statement|chunky|oversized|large/.test(text)) return "statement";
  if (/delicate|dainty|slim|fine|minimal/.test(text)) return "delicate";
  return "";
}

function beltCompatibility(item: any): boolean | undefined {
  const explicit = value(item, "beltCompatible");
  if (typeof explicit === "boolean") return explicit;
  const waistband = known(value(item, "waistbandType") || value(item, "waistType"));
  if (["elastic", "drawstring", "integrated_belt"].includes(waistband)) return false;
  if (waistband === "belt_loops") return true;
  return undefined;
}

export function footwearAttributeScore(item: any, selectedItems: any[], context: AttributeContext) {
  const footwear = value(item, "footwearAttributes") || item?.footwearAttributes || {};
  const text = itemText(item);
  const target = contextText(context);
  const toe = known(footwear.toeStyle || value(item, "toeStyle"));
  const activity = asList(footwear.activity || value(item, "activity")).join(" ");
  const weather = asList(footwear.weatherSuitability || value(item, "weatherSuitability")).join(" ");
  const comfort = known(footwear.comfortLevel || value(item, "comfortLevel"));
  const formal = /formal|wedding|gala|ceremony|business|interview|office|church|black tie/.test(target);
  const rain = /rain|wet|storm|drizzle/.test(target);
  const cold = /cold|winter|snow|chilly/.test(target);
  const hot = /hot|warm|summer|humid|beach|resort/.test(target);
  const athletic = /sport|athletic|training|running|gym/.test(`${activity} ${text}`);
  const reasons: string[] = [];
  let score = 0;

  if (formal && toe === "closed") { score += 8; reasons.push("closed_toe_formality"); }
  if (formal && ["open", "peep"].includes(toe)) { score -= 10; reasons.push("open_toe_formality_conflict"); }
  if (formal && athletic) { score -= 20; reasons.push("athletic_formality_conflict"); }
  if (rain && ["open", "peep"].includes(toe)) { score -= 24; reasons.push("open_toe_weather_conflict"); }
  if (cold && ["open", "peep"].includes(toe)) { score -= 18; reasons.push("open_toe_cold_conflict"); }
  if (rain && /rain|wet|water_resistant|waterproof/.test(weather)) { score += 12; reasons.push("rain_suitable"); }
  if (rain && /suede/.test(text)) { score -= 9; reasons.push("suede_rain_conflict"); }
  if (hot && ["open", "peep"].includes(toe)) { score += 8; reasons.push("warm_weather_toe"); }
  if (context.styleProfile?.comfortPriority === "high" && comfort === "high") { score += 8; reasons.push("comfort_priority"); }
  if (context.styleProfile?.comfortPriority === "high" && comfort === "low") { score -= 8; reasons.push("comfort_conflict"); }

  const selectedLength = selectedItems.map((selected) => known(value(selected, "garmentLength") || value(selected, "hemLength"))).find(Boolean);
  const selectedLeg = selectedItems.map((selected) => known(value(selected, "legShape") || value(selected, "silhouette"))).find(Boolean);
  const compatibility = asList(footwear.dressCompatibility).concat(asList(footwear.trouserCompatibility));
  if (compatibility.length && [selectedLength, selectedLeg].some((entry) => entry && compatibility.includes(entry))) {
    score += 7;
    reasons.push("garment_compatibility");
  }

  return { score: Math.max(-32, Math.min(22, score)), reasons };
}

export function accessoryAttributeScore(item: any, selectedItems: any[], context: AttributeContext) {
  const role = accessoryRole(item);
  const target = contextText(context);
  const selectedNeckline = selectedItems.map(neckline).find(Boolean);
  const selectedCuff = selectedItems.map((selected) => known(value(selected, "cuffType"))).find(Boolean);
  const itemScale = scale(item);
  const text = itemText(item);
  const formal = /formal|wedding|gala|ceremony|business|interview|office|church|black tie/.test(target);
  const reasons: string[] = [];
  let score = 0;

  if (role === "neck_jewelry") {
    if (["v_neck", "scoop", "square", "strapless", "off_shoulder", "sweetheart"].includes(selectedNeckline || "")) { score += 12; reasons.push("neckline_compatible"); }
    if (["high_neck", "collared"].includes(selectedNeckline || "")) { score -= itemScale === "statement" ? 22 : 12; reasons.push("neckline_conflict"); }
  }
  if (role === "waist") {
    const compatibility = selectedItems.map(beltCompatibility).find((entry) => entry !== undefined);
    if (compatibility === true) { score += 15; reasons.push("belt_compatible"); }
    if (compatibility === false) { score -= 32; reasons.push("belt_structure_conflict"); }
  }
  if (/cufflinks?/.test(text)) {
    if (["french_cuff", "convertible"].includes(selectedCuff || "")) { score += 18; reasons.push("cufflink_compatible"); }
    else { score -= 30; reasons.push("cufflink_structure_conflict"); }
  }
  if (role === "carry") {
    if (formal && /clutch|minaudiere|small|structured|evening/.test(text)) { score += 12; reasons.push("formal_bag"); }
    if (formal && /backpack|duffel|gym|beach/.test(text)) { score -= 20; reasons.push("bag_formality_conflict"); }
    if (/business|office|work|interview/.test(target) && /tote|briefcase|satchel|structured/.test(text)) { score += 10; reasons.push("work_bag"); }
  }

  const existingTones = selectedItems.map(metalTone).filter(Boolean);
  const candidateTone = metalTone(item);
  if (candidateTone && existingTones.length) {
    if (existingTones.includes(candidateTone)) { score += 6; reasons.push("metal_tone_coordinated"); }
    else { score -= 5; reasons.push("metal_tone_mixed"); }
  }
  if (itemScale === "statement" && selectedItems.some((selected) => scale(selected) === "statement")) {
    score -= 14;
    reasons.push("multiple_statement_items");
  }

  return { score: Math.max(-36, Math.min(24, score)), reasons };
}

export function outfitAttributeCompatibilityScore(items: any[], context: AttributeContext) {
  let score = 0;
  const reasons: string[] = [];
  const shoes = items.filter((item) => item?.category === "shoes" || /shoe|sneaker|boot|loafer|sandal|heel|pump/.test(itemText(item)));
  for (const shoe of shoes) {
    const result = footwearAttributeScore(shoe, items.filter((item) => item !== shoe), context);
    score += result.score;
    reasons.push(...result.reasons);
  }
  for (const item of items.filter((candidate) => accessoryRole(candidate))) {
    const result = accessoryAttributeScore(item, items.filter((candidate) => candidate !== item), context);
    score += result.score;
    reasons.push(...result.reasons);
  }

  const clothing = items.filter((item) => ["tops", "bottoms", "dresses", "outerwear", "native"].includes(item?.category));
  const drapes = clothing.map((item) => known(value(item, "fabricDrape"))).filter(Boolean);
  const fits = clothing.map((item) => known(value(item, "garmentFit") || value(item, "fit") || value(item, "silhouette"))).filter(Boolean);
  const hasStructure = drapes.some((entry) => /structured|stiff|heavy/.test(entry)) || fits.some((entry) => /tailored|fitted|slim|structured/.test(entry));
  const hasMovement = drapes.some((entry) => /soft|flowing/.test(entry)) || fits.some((entry) => /flowing|wide|relaxed|oversized/.test(entry));
  if (hasStructure && hasMovement) { score += 7; reasons.push("proportion_balanced"); }
  if (fits.filter((entry) => /oversized|wide|flowing/.test(entry)).length >= 2 && !hasStructure) { score -= 8; reasons.push("uncontrolled_volume"); }

  return {
    score: Math.max(-50, Math.min(40, Math.round(score))),
    reasons: Array.from(new Set(reasons))
  };
}
