export type RecommendationQualityRecord = {
  confidenceScore?: number | null;
  completenessStatus?: string;
  footwearIncluded?: boolean;
  viewedAt?: Date | string | null;
  savedAt?: Date | string | null;
  acceptedAt?: Date | string | null;
  rejectedAt?: Date | string | null;
  wornAt?: Date | string | null;
  swappedAt?: Date | string | null;
};

function ratio(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 10_000) / 10_000 : 0;
}

function predictedProbability(record: RecommendationQualityRecord) {
  const raw = Number(record.confidenceScore || 0);
  return Math.max(0, Math.min(1, raw > 1 ? raw / 100 : raw));
}

export function outcomeValue(record: RecommendationQualityRecord) {
  if (record.wornAt) return 1;
  if (record.savedAt) return 0.85;
  if (record.acceptedAt) return 0.7;
  if (record.rejectedAt) return 0;
  if (record.swappedAt) return 0.35;
  if (record.viewedAt) return 0.45;
  return 0.5;
}

export function computeRecommendationQuality(records: RecommendationQualityRecord[]) {
  const total = records.length;
  const count = (predicate: (record: RecommendationQualityRecord) => boolean) => records.filter(predicate).length;
  const accepted = count((record) => Boolean(record.acceptedAt));
  const rejected = count((record) => Boolean(record.rejectedAt));
  const saved = count((record) => Boolean(record.savedAt));
  const worn = count((record) => Boolean(record.wornAt));
  const viewed = count((record) => Boolean(record.viewedAt));
  const confidenceRecords = records.filter((record) => typeof record.confidenceScore === "number");
  const brierScore = confidenceRecords.length
    ? confidenceRecords.reduce((sum, record) => sum + Math.pow(predictedProbability(record) - outcomeValue(record), 2), 0) / confidenceRecords.length
    : null;
  const averageConfidence = confidenceRecords.length
    ? confidenceRecords.reduce((sum, record) => sum + predictedProbability(record), 0) / confidenceRecords.length
    : null;
  const averageOutcome = total ? records.reduce((sum, record) => sum + outcomeValue(record), 0) / total : null;

  return {
    generatedCount: total,
    viewedCount: viewed,
    acceptedCount: accepted,
    rejectedCount: rejected,
    savedCount: saved,
    wornCount: worn,
    viewRate: ratio(viewed, total),
    acceptanceRate: ratio(accepted, total),
    rejectionRate: ratio(rejected, total),
    saveRate: ratio(saved, total),
    wearThroughRate: ratio(worn, total),
    completeOutfitRate: ratio(count((record) => record.completenessStatus === "complete"), total),
    footwearInclusionRate: ratio(count((record) => Boolean(record.footwearIncluded)), total),
    averageConfidence: averageConfidence === null ? null : Math.round(averageConfidence * 10_000) / 10_000,
    averageOutcome: averageOutcome === null ? null : Math.round(averageOutcome * 10_000) / 10_000,
    brierScore: brierScore === null ? null : Math.round(brierScore * 10_000) / 10_000
  };
}

export function logRecommendationOutcome(input: {
  recommendationId: string;
  event: "accepted" | "rejected" | "worn";
  confidenceScore?: number | null;
  completenessStatus?: string;
  footwearIncluded?: boolean;
  explicitItemFeedbackCount?: number;
}) {
  console.info("fitpick.recommendation.outcome", {
    recommendationId: input.recommendationId,
    event: input.event,
    confidenceScore: input.confidenceScore ?? null,
    completenessStatus: input.completenessStatus || "unknown",
    footwearIncluded: Boolean(input.footwearIncluded),
    explicitItemFeedbackCount: input.explicitItemFeedbackCount || 0,
    timestamp: new Date().toISOString()
  });
}
