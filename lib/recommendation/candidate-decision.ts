import { metadataValue } from "@/lib/recommendation/scoring";

type Candidate = { items: any[]; score: number; scoreBreakdown?: Record<string, any>; similarityMetadata?: Record<string, any> };

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function itemName(item: any) {
  return item?.name || [item?.color, item?.subcategory || item?.category].filter(Boolean).join(" ") || "closet item";
}

export function evaluateFitAndProportion(items: any[], styleProfile?: any) {
  const validItems = (items || []).filter(Boolean);
  const warnings: string[] = [];
  const evidence: string[] = [];
  const fits = validItems.map((item) => normalize(metadataValue(item, "fit") || item.garmentFit || item.fit)).filter(Boolean);
  const silhouettes = validItems.map((item) => normalize(metadataValue(item, "silhouette"))).filter(Boolean);
  const unknownFitCount = validItems.filter((item) => {
    const fit = normalize(metadataValue(item, "fit") || item.garmentFit || item.fit);
    return !fit || fit === "unknown";
  }).length;
  const relaxedCount = fits.filter((fit) => /relaxed|loose|oversized|flowing/.test(fit)).length;
  const structuredCount = fits.filter((fit) => /tailored|slim|structured|fitted/.test(fit)).length;
  const allVolume = validItems.length >= 2 && relaxedCount >= Math.min(2, validItems.length);
  const walking = styleProfile?.activeSituation?.walkingRequirement;
  const footwear = validItems.find((item) => item.category === "shoes");
  const shoeText = normalize([footwear?.name, footwear?.subcategory, footwear ? metadataValue(footwear, "garmentType") : ""].join(" "));

  if (structuredCount && relaxedCount) evidence.push("Structured and relaxed volumes create visual balance.");
  else if (silhouettes.length >= 2) evidence.push("The recorded silhouettes form a consistent proportion story.");
  else if (allVolume) warnings.push("Several relaxed-volume pieces are combined; exact proportion confidence is limited.");
  if (unknownFitCount) warnings.push(`${unknownFitCount} selected item${unknownFitCount === 1 ? " has" : "s have"} limited fit metadata.`);
  if (walking === "high" && footwear && /stiletto|high heel|platform/.test(shoeText)) warnings.push("The selected footwear may be less practical for extensive walking.");
  if (walking === "high" && footwear && /sneaker|trainer|loafer|flat|low heel|boot/.test(shoeText)) evidence.push("Footwear supports the stated walking requirement.");

  const metadataCoverage = validItems.length ? (validItems.length - unknownFitCount) / validItems.length : 0;
  const practicalityPenalty = warnings.some((warning) => warning.includes("walking")) ? 0.2 : 0;
  const confidence = Math.max(0, Math.min(1, Math.round((metadataCoverage * 0.75 + (evidence.length ? 0.2 : 0.05) - practicalityPenalty) * 100) / 100));
  return { confidence, evidence, warnings, metadataCoverage };
}

function decisiveDimensions(winner: Candidate, alternative?: Candidate) {
  const left = winner.scoreBreakdown || {};
  const right = alternative?.scoreBreakdown || {};
  const labels: Record<string, string> = {
    occasionFit: "occasion suitability", dressCodeFit: "dress-code alignment", weatherFit: "weather practicality",
    colorHarmony: "color harmony", silhouetteBalance: "silhouette balance", materialCompatibility: "material compatibility",
    styleProfile: "personal style", memoryPreference: "learned preference", rotation: "wardrobe rotation",
    comfort: "comfort", compatibilityGraph: "garment compatibility"
  };
  return Object.keys(labels)
    .map((key) => ({ key, label: labels[key], delta: Number(left[key] || 0) - Number(right[key] || 0), value: Number(left[key] || 0) }))
    .filter((entry) => entry.value !== 0 || entry.delta !== 0)
    .sort((a, b) => b.delta - a.delta || b.value - a.value)
    .slice(0, 4);
}

export function buildCandidateDecisionEvidence(candidates: Candidate[], styleProfile?: any) {
  const safeCandidates = candidates.filter((candidate) => candidate && Array.isArray(candidate.items));
  const finalists = safeCandidates.slice(0, 3).map((candidate, index) => ({
    rank: index + 1,
    itemIds: candidate.items.filter(Boolean).map((item) => String(item._id || item.id)).filter(Boolean),
    itemNames: candidate.items.map(itemName),
    score: Math.round(candidate.score * 10) / 10,
    fitAndProportion: evaluateFitAndProportion(candidate.items, styleProfile),
    similarityMetadata: candidate.similarityMetadata || {}
  }));
  const winner = safeCandidates[0];
  const runnerUp = safeCandidates[1];
  if (!winner) return { finalists: [], decisiveDimensions: [], selectionReasons: [], runnerUpTradeoff: "" };
  const dimensions = decisiveDimensions(winner, runnerUp);
  const fit = evaluateFitAndProportion(winner.items, styleProfile);
  const selectionReasons = [
    ...dimensions.slice(0, 3).map((entry) => `Stronger ${entry.label}${entry.delta > 0 ? ` (+${Math.round(entry.delta * 10) / 10})` : ""}.`),
    ...fit.evidence.slice(0, 2)
  ].slice(0, 4);
  return {
    finalists,
    decisiveDimensions: dimensions,
    selectionReasons,
    fitAndProportion: fit,
    runnerUpTradeoff: runnerUp
      ? `The runner-up remained valid but scored lower on ${dimensions[0]?.label || "overall contextual fit"}.`
      : "No distinct runner-up was available from this closet."
  };
}
