export function computeRecommendationConfidence(input: {
  score: number;
  candidateCount: number;
  validation?: any;
  wardrobeReadiness?: any;
  completenessStatus?: string;
  weatherContext?: string;
}) {
  let confidence = Math.max(0, Math.min(100, Math.round((input.score / 260) * 100)));
  if (input.candidateCount >= 30) confidence += 6;
  if (input.candidateCount < 5) confidence -= 12;
  if (input.validation?.valid) confidence += 8;
  if (input.validation?.warnings?.length) confidence -= Math.min(16, input.validation.warnings.length * 4);
  if (input.completenessStatus && input.completenessStatus !== "complete") confidence -= 14;
  if (input.wardrobeReadiness?.isSmallWardrobe) confidence -= 8;
  if (input.weatherContext) confidence += 3;

  const overallConfidence = Math.max(0, Math.min(100, confidence));
  return {
    overallConfidence,
    level: overallConfidence >= 78 ? "high" : overallConfidence >= 55 ? "medium" : "low",
    factors: {
      candidateQuality: Math.max(0, Math.min(100, Math.round((input.score / 240) * 100))),
      candidateDepth: Math.min(100, input.candidateCount * 4),
      validation: input.validation?.valid ? 92 : 48,
      wardrobeCompleteness: input.wardrobeReadiness?.strengthScore ?? null,
      weatherCertainty: input.weatherContext ? 82 : 55
    }
  };
}
