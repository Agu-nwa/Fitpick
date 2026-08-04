export type RecommendationWeatherAvailability = "available" | "unavailable" | "not_requested";

export function resolveRecommendationWeatherAvailability(input: {
  requested: boolean;
  weatherContext?: string | null;
}): RecommendationWeatherAvailability {
  if (String(input.weatherContext || "").trim()) return "available";
  return input.requested ? "unavailable" : "not_requested";
}

export function recommendationWeatherFitCopy(
  weatherContext: unknown,
  availability: RecommendationWeatherAvailability
) {
  const context = typeof weatherContext === "string" ? weatherContext.trim() : "";
  if (context) return context;
  return availability === "unavailable"
    ? "Weather was not included in this recommendation."
    : "Weather was not requested for this recommendation.";
}
