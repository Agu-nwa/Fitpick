export function buildExplainabilityBreakdown(input: {
  scoreBreakdown?: Record<string, any>;
  confidence?: any;
  validation?: any;
  rotationScore?: number;
  personalPreferenceScore?: number;
  fashionKnowledgeScore?: number;
}) {
  const score = input.scoreBreakdown || {};
  return {
    occasionMatch: score.occasionFit ?? null,
    weatherMatch: score.weatherFit ?? null,
    colorHarmony: score.colorHarmony ?? null,
    silhouetteBalance: score.silhouetteBalance ?? null,
    accessoryCompletion: score.accessoryCompletion?.selectedCount ?? 0,
    personalPreferenceMatch: input.personalPreferenceScore ?? score.personalPreference ?? 0,
    wardrobeRotationBonus: input.rotationScore ?? score.wardrobeRotation ?? 0,
    fashionKnowledge: input.fashionKnowledgeScore ?? score.fashionKnowledge ?? 0,
    validation: input.validation ? {
      valid: Boolean(input.validation.valid),
      warnings: input.validation.warnings || []
    } : null,
    overallConfidence: input.confidence?.overallConfidence ?? null
  };
}
