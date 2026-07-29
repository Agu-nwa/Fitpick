import { analyseColourValue } from "@/lib/wardrobe/compatibility/colour-analysis";

function clean(value: unknown) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function metadataValue(item: any, key: string) {
  return item.verifiedMetadata?.[key]?.value ??
    item.recommendationMetadata?.universal?.[key] ??
    item.recommendationMetadata?.specific?.[key] ??
    item.aiAnalysis?.fields?.[key]?.value ??
    item[key] ??
    "";
}

function sameText(a: unknown, b: unknown) {
  const left = clean(a);
  const right = clean(b);
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}

function candidateText(item: any) {
  return [
    item.name,
    item.category,
    item.subcategory,
    item.color,
    item.pattern,
    item.fabric,
    item.fit,
    metadataValue(item, "brand"),
    metadataValue(item, "recognizedEntity"),
    metadataValue(item, "silhouette"),
    metadataValue(item, "distinctiveFeatures")
  ].map(clean).filter(Boolean).join(" ");
}

export function detectLikelyDuplicate(input: {
  candidate: any;
  existingItems: any[];
}) {
  const candidate = input.candidate || {};
  let best: any = null;

  for (const item of input.existingItems || []) {
    let score = 0;
    const reasons: string[] = [];

    if (sameText(candidate.category, item.category)) {
      score += 22;
      reasons.push("Same category");
    }
    if (sameText(candidate.subcategory, item.subcategory)) {
      score += 18;
      reasons.push("Same subtype");
    }
    const candidateColour = analyseColourValue(candidate.color || metadataValue(candidate, "primaryColor"));
    const itemColour = analyseColourValue(item.color || metadataValue(item, "primaryColor"));
    if (candidateColour.family && itemColour.family && candidateColour.family === itemColour.family) {
      score += candidateColour.shade === itemColour.shade ? 18 : 12;
      reasons.push("Similar colour");
    }
    if (sameText(candidate.pattern, item.pattern || metadataValue(item, "pattern"))) {
      score += 12;
      reasons.push("Similar pattern");
    }
    if (sameText(candidate.fabric, item.fabric || metadataValue(item, "fabricEstimate"))) {
      score += 10;
      reasons.push("Similar material");
    }
    if (sameText(metadataValue(candidate, "brand"), metadataValue(item, "brand"))) {
      score += 12;
      reasons.push("Same brand");
    }
    if (sameText(metadataValue(candidate, "silhouette"), metadataValue(item, "silhouette"))) {
      score += 8;
      reasons.push("Similar silhouette");
    }

    const candidateTokens = new Set(candidateText(candidate).split(" ").filter((token) => token.length > 3));
    const itemTokens = new Set(candidateText(item).split(" ").filter((token) => token.length > 3));
    const overlap = Array.from(candidateTokens).filter((token) => itemTokens.has(token)).length;
    score += Math.min(14, overlap * 2);

    const confidence = Math.max(0, Math.min(1, score / 100));
    if (!best || confidence > best.confidence) {
      best = {
        likelyDuplicateItemId: String(item._id || item.id || ""),
        confidence,
        score,
        reasons
      };
    }
  }

  const status = best?.confidence >= 0.75
    ? "likely_duplicate"
    : best?.confidence >= 0.55
      ? "possible_duplicate"
      : "unique";

  return {
    status,
    confidence: best?.confidence || 0,
    likelyDuplicateItemId: status === "unique" ? "" : best?.likelyDuplicateItemId || "",
    reasons: status === "unique" ? [] : best?.reasons || [],
    checkedAt: new Date().toISOString()
  };
}
