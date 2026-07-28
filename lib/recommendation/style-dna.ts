import { metadataList, metadataValue } from "@/lib/recommendation/scoring";

const STYLE_DNA_FIELDS = [
  "minimal",
  "classic",
  "elegant",
  "luxury",
  "streetwear",
  "creative",
  "sporty"
];

function normalize(value: unknown) {
  return String(value || "").toLowerCase();
}

function itemText(item: any) {
  return [
    item?.name,
    item?.category,
    item?.subcategory,
    item?.pattern,
    item?.fabric,
    metadataValue(item, "styleFamily"),
    metadataValue(item, "garmentType"),
    metadataValue(item, "fabricEstimate"),
    metadataList(item, "occasionSuitability").join(" ")
  ].filter(Boolean).join(" ").toLowerCase();
}

export function styleDnaSignals(styleProfile?: any): string[] {
  const raw = [
    ...(Array.isArray(styleProfile?.styleWords) ? styleProfile.styleWords : []),
    ...(Array.isArray(styleProfile?.preferredAesthetics) ? styleProfile.preferredAesthetics : []),
    ...(Array.isArray(styleProfile?.notes) ? styleProfile.notes : [])
  ];
  return raw
    .flatMap((entry) => normalize(entry).split(/[^a-z0-9]+/))
    .filter((entry) => STYLE_DNA_FIELDS.includes(entry));
}

export function scoreStyleDna(items: any[], styleProfile?: any) {
  const signals = styleDnaSignals(styleProfile);
  if (!signals.length) return 0;

  let score = 0;
  for (const item of items) {
    const text = itemText(item);
    for (const signal of signals) {
      if (text.includes(signal)) score += 4;
    }
  }

  return Math.min(24, score);
}
