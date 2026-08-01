export const accessorySubtypeValues = [
  "watch", "necklace", "bracelet", "bangle", "cuff", "earrings", "ring", "anklet", "brooch", "pendant",
  "belt", "scarf", "tie", "pocket-square", "gloves", "hat", "sunglasses", "hair-accessory", "other"
] as const;

export type AccessorySubtype = (typeof accessorySubtypeValues)[number];
export type AccessorySubtypeConfidenceLevel = "high" | "medium" | "low" | "unresolved";
export type AccessorySubtypeResolutionSource = "user" | "existing-canonical" | "saved-subtype" | "garment-type" | "verified-metadata" | "name" | "description" | "image-analysis" | "combined" | "migration";
export type AccessorySubtypeResolutionStatus = "canonical" | "inferred-high" | "inferred-medium" | "inferred-low" | "needs-user-confirmation" | "unresolved";

export const ACCESSORY_SUBTYPE_CONFIDENCE_THRESHOLDS = { high: 0.9, medium: 0.6, low: 0.3 } as const;
export const ACCESSORY_SUBTYPE_SCORE_MULTIPLIERS = { high: 1, medium: 0.9, low: 0.74, unresolved: 0.7 } as const;
export const accessorySubtypeResolverVersion = "accessory-subtype-v2";

export type AccessorySubtypeResolutionMetadata = {
  status: AccessorySubtypeResolutionStatus;
  confidenceScore?: number | null;
  confidenceLevel?: AccessorySubtypeConfidenceLevel | null;
  source?: AccessorySubtypeResolutionSource | null;
  evidence?: string[];
  alternatives?: Array<{ subtype: AccessorySubtype; confidence: number }>;
  resolverVersion?: string | null;
  resolvedAt?: Date | string | null;
  resolvedBy?: "user" | "system" | "migration" | null;
  migrationRunId?: string | null;
};

export type AccessorySubtypeResolutionResult = {
  subtype: AccessorySubtype | null;
  confidenceScore: number;
  confidenceLevel: AccessorySubtypeConfidenceLevel;
  status: "resolved" | "ambiguous" | "conflicting" | "unresolved";
  sources: AccessorySubtypeResolutionSource[];
  evidence: string[];
  alternatives: Array<{ subtype: AccessorySubtype; confidence: number }>;
  reasonCode: "existing-canonical" | "user-confirmed" | "multiple-agreeing-signals" | "single-strong-signal" | "conflicting-signals" | "generic-jewelry" | "insufficient-metadata" | "image-text-disagreement" | "legacy-value";
};

type WardrobeLike = Record<string, unknown>;
type Signal = { subtype: AccessorySubtype; score: number; source: AccessorySubtypeResolutionSource; evidence: string };
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

const patterns: Array<[AccessorySubtype, RegExp]> = [
  ["watch", /\b(wristwatch|smartwatch|watch(?:es)?)\b/i],
  ["earrings", /\b(earrings?|ear studs?|stud earrings?|hoop earrings?)\b/i],
  ["bangle", /\bbangles?\b/i], ["cuff", /\b(?:wrist |leather )?cuffs?\b/i], ["bracelet", /\bbracelets?\b/i],
  ["anklet", /\banklets?\b/i], ["brooch", /\b(brooch(?:es)?|lapel pin)\b/i], ["pendant", /\bpendants?\b/i],
  ["necklace", /\b(necklaces?|chokers?|chains?)\b/i], ["ring", /\brings?\b/i],
  ["pocket-square", /\bpocket[ -]?squares?\b/i], ["hair-accessory", /\b(hair clips?|headbands?|hair pins?|hair combs?|hair ties?)\b/i],
  ["belt", /\bbelts?\b/i], ["scarf", /\b(scarves|scarf)\b/i], ["tie", /\b(bow[ -]?ties|neckties?)\b/i],
  ["gloves", /\bgloves?\b/i], ["sunglasses", /\b(sunglasses|shades|eyewear)\b/i], ["hat", /\b(hats?|caps?|beanies?|fascinators?)\b/i]
];

function matches(text: string) {
  return patterns.filter(([, pattern]) => pattern.test(text)).map(([subtype]) => subtype);
}
function confidenceLevel(score: number): AccessorySubtypeConfidenceLevel {
  if (score >= ACCESSORY_SUBTYPE_CONFIDENCE_THRESHOLDS.high) return "high";
  if (score >= ACCESSORY_SUBTYPE_CONFIDENCE_THRESHOLDS.medium) return "medium";
  if (score >= ACCESSORY_SUBTYPE_CONFIDENCE_THRESHOLDS.low) return "low";
  return "unresolved";
}
function unresolved(reasonCode: AccessorySubtypeResolutionResult["reasonCode"]): AccessorySubtypeResolutionResult {
  return { subtype: null, confidenceScore: reasonCode === "generic-jewelry" ? 0.25 : 0, confidenceLevel: reasonCode === "generic-jewelry" ? "low" : "unresolved", status: reasonCode === "generic-jewelry" ? "ambiguous" : "unresolved", sources: [], evidence: [], alternatives: [], reasonCode };
}

export function accessorySubtypeForIntakeId(id: string): AccessorySubtype | null {
  const mapping: Record<string, AccessorySubtype> = {
    watches: "watch", necklaces: "necklace", bracelets: "bracelet", bangles: "bangle", cuffs: "cuff", earrings: "earrings", rings: "ring", anklets: "anklet", brooches: "brooch", pendants: "pendant", belts: "belt", scarves: "scarf", ties: "tie", pocket_squares: "pocket-square", gloves: "gloves", hats: "hat", sunglasses: "sunglasses", hair_accessories: "hair-accessory", other_accessory: "other"
  };
  return mapping[id] || null;
}

export function resolveAccessorySubtype(item: WardrobeLike): AccessorySubtypeResolutionResult {
  if (String(item.category || "") !== "accessories") return unresolved("insufficient-metadata");
  const resolution = record(item.accessorySubtypeResolution);
  const direct = canonical(item.accessorySubtype);
  if (direct && resolution.resolvedBy === "user") return { subtype: direct, confidenceScore: 1, confidenceLevel: "high", status: "resolved", sources: ["user"], evidence: [], alternatives: [], reasonCode: "user-confirmed" };
  if (direct) return { subtype: direct, confidenceScore: 1, confidenceLevel: "high", status: "resolved", sources: ["existing-canonical"], evidence: [], alternatives: [], reasonCode: "existing-canonical" };

  const userInput = record(item.userInputMetadata);
  const categoryMetadata = record(item.categorySpecificMetadata);
  const verified = record(item.verifiedMetadata);
  const analysis = record(item.aiAnalysis);
  const fields = record(analysis.fields);
  const signalInputs: Array<[AccessorySubtypeResolutionSource, string, number]> = [
    ["saved-subtype", [scalar(item.subcategory), scalar(userInput.accessorySubtype), scalar(userInput.categoryId)].join(" "), 0.94],
    ["garment-type", [scalar(item.garmentType), scalar(verified.garmentType)].join(" "), 0.92],
    ["verified-metadata", [scalar(verified.accessorySubtype), scalar(verified.recognizedEntity), scalar(fields.accessorySubtype), scalar(fields.garmentType)].join(" "), 0.91],
    ["name", scalar(item.name), 0.9],
    ["description", [scalar(item.description), scalar(categoryMetadata.subtype)].join(" "), 0.62]
  ];
  const signals: Signal[] = [];
  for (const [source, text, score] of signalInputs) {
    const detected = matches(text);
    for (const subtype of detected) {
      const specificityPenalty = subtype === "bracelet" && (detected.includes("bangle") || detected.includes("cuff"))
        ? 0.12
        : subtype === "necklace" && detected.includes("pendant") ? 0.12 : 0;
      signals.push({ subtype, score: score - specificityPenalty, source, evidence: `${source}:${subtype}` });
    }
  }
  if (!signals.length) {
    const generic = /\b(jewelry|jewellery|accessory|accessories)\b/i.test([scalar(item.name), scalar(item.subcategory)].join(" "));
    return unresolved(generic ? "generic-jewelry" : "insufficient-metadata");
  }
  const totals = new Map<AccessorySubtype, { score: number; sources: Set<AccessorySubtypeResolutionSource> }>();
  for (const signal of signals) {
    const current = totals.get(signal.subtype) || { score: 0, sources: new Set<AccessorySubtypeResolutionSource>() };
    current.score = Math.max(current.score, signal.score) + (current.sources.size ? 0.04 : 0);
    current.sources.add(signal.source);
    totals.set(signal.subtype, current);
  }
  const ranked = Array.from(totals.entries()).map(([subtype, value]) => ({ subtype, confidence: Math.min(0.99, value.score), sources: Array.from(value.sources) })).sort((a, b) => b.confidence - a.confidence);
  const strongest = ranked[0];
  const competing = ranked[1];
  const conflict = Boolean(competing && competing.confidence >= 0.9 && strongest.confidence - competing.confidence < 0.08);
  if (conflict) return { subtype: null, confidenceScore: Math.min(0.59, strongest.confidence), confidenceLevel: "low", status: "conflicting", sources: Array.from(new Set(signals.map((signal) => signal.source))), evidence: signals.map((signal) => signal.evidence).slice(0, 8), alternatives: ranked.slice(0, 3).map(({ subtype, confidence }) => ({ subtype, confidence })), reasonCode: "conflicting-signals" };
  const level = confidenceLevel(strongest.confidence);
  return {
    subtype: level === "unresolved" || level === "low" ? null : strongest.subtype,
    confidenceScore: strongest.confidence,
    confidenceLevel: level,
    status: level === "high" ? "resolved" : "ambiguous",
    sources: strongest.sources,
    evidence: signals.filter((signal) => signal.subtype === strongest.subtype).map((signal) => signal.evidence).slice(0, 6),
    alternatives: ranked.slice(1, 3).map(({ subtype, confidence }) => ({ subtype, confidence })),
    reasonCode: strongest.sources.length > 1 ? "multiple-agreeing-signals" : strongest.sources[0] === "description" ? "legacy-value" : "single-strong-signal"
  };
}

export function resolutionMetadata(result: AccessorySubtypeResolutionResult, resolvedBy: "system" | "migration" = "system", migrationRunId?: string): AccessorySubtypeResolutionMetadata {
  return { status: result.status === "resolved" && result.confidenceLevel === "high" ? "inferred-high" : result.status === "conflicting" || result.confidenceLevel === "medium" ? "needs-user-confirmation" : result.confidenceLevel === "low" ? "inferred-low" : "unresolved", confidenceScore: result.confidenceScore, confidenceLevel: result.confidenceLevel, source: result.sources.length > 1 ? "combined" : result.sources[0] || null, evidence: result.evidence, alternatives: result.alternatives, resolverVersion: accessorySubtypeResolverVersion, resolvedAt: new Date(), resolvedBy, migrationRunId: migrationRunId || null };
}

export function userConfirmedResolution(subtype: AccessorySubtype | null): AccessorySubtypeResolutionMetadata {
  return { status: subtype ? "canonical" : "unresolved", confidenceScore: subtype ? 1 : 0, confidenceLevel: subtype ? "high" : "unresolved", source: "user", evidence: [], alternatives: [], resolverVersion: accessorySubtypeResolverVersion, resolvedAt: new Date(), resolvedBy: "user", migrationRunId: null };
}

export function needsAccessorySubtypeConfirmation(item: WardrobeLike) {
  if (String(item.category || "") !== "accessories") return false;
  const result = resolveAccessorySubtype(item);
  return result.reasonCode !== "user-confirmed" && result.reasonCode !== "existing-canonical" && (result.confidenceLevel !== "high" || result.status !== "resolved");
}

export function accessorySubtypeFor(item: WardrobeLike) {
  return resolveAccessorySubtype(item).subtype;
}
