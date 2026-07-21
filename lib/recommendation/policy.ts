export const RECOMMENDATION_SCORING_VERSION = "stylist-score-v2";

export type RecommendationMode =
  | "todays_best"
  | "something_different"
  | "most_comfortable"
  | "luxury_edit"
  | "business_ready"
  | "smart_casual"
  | "date_night"
  | "weekend"
  | "travel_ready"
  | "rain_ready"
  | "minimal"
  | "statement_look"
  | "wedding_guest"
  | "interview"
  | "dinner"
  | "warm_weather"
  | "cold_weather";

export type ScoringWeights = {
  categoryValidity: number;
  occasionFit: number;
  weatherFit: number;
  colorHarmony: number;
  silhouetteBalance: number;
  materialCompatibility: number;
  styleProfile: number;
  memoryPreference: number;
  rotation: number;
  novelty: number;
  completeness: number;
  comfort: number;
  luxury: number;
};

const baseWeights: ScoringWeights = {
  categoryValidity: 1,
  occasionFit: 1,
  weatherFit: 1,
  colorHarmony: 1,
  silhouetteBalance: 1,
  materialCompatibility: 1,
  styleProfile: 1,
  memoryPreference: 1,
  rotation: 1,
  novelty: 1,
  completeness: 1,
  comfort: 1,
  luxury: 1
};

const modeWeights: Partial<Record<RecommendationMode, Partial<ScoringWeights>>> = {
  something_different: { novelty: 1.8, rotation: 1.6, styleProfile: 0.85 },
  most_comfortable: { comfort: 1.8, silhouetteBalance: 1.25, luxury: 0.8 },
  luxury_edit: { luxury: 1.8, colorHarmony: 1.25, occasionFit: 1.2 },
  business_ready: { occasionFit: 1.35, luxury: 1.2, colorHarmony: 1.15 },
  smart_casual: { occasionFit: 1.2, comfort: 1.15, silhouetteBalance: 1.15 },
  date_night: { occasionFit: 1.35, novelty: 1.15, luxury: 1.15 },
  weekend: { comfort: 1.35, rotation: 1.25 },
  travel_ready: { comfort: 1.25, weatherFit: 1.25, materialCompatibility: 1.2 },
  rain_ready: { weatherFit: 1.8, materialCompatibility: 1.15 },
  minimal: { colorHarmony: 1.35, silhouetteBalance: 1.2, novelty: 0.8 },
  statement_look: { novelty: 1.55, luxury: 1.25, styleProfile: 0.9 },
  wedding_guest: { occasionFit: 1.7, luxury: 1.25, completeness: 1.2 },
  interview: { occasionFit: 1.7, colorHarmony: 1.25, luxury: 1.15 },
  dinner: { occasionFit: 1.3, luxury: 1.15 },
  warm_weather: { weatherFit: 1.6, comfort: 1.2, materialCompatibility: 1.2 },
  cold_weather: { weatherFit: 1.6, materialCompatibility: 1.25, completeness: 1.15 }
};

export function normalizeRecommendationMode(value?: string | null): RecommendationMode {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (normalized in modeWeights || normalized === "todays_best") return normalized as RecommendationMode;
  if (/different|fresh|new/.test(normalized)) return "something_different";
  if (/comfort/.test(normalized)) return "most_comfortable";
  if (/luxury|premium|elegant/.test(normalized)) return "luxury_edit";
  if (/business|work|office/.test(normalized)) return "business_ready";
  if (/date/.test(normalized)) return "date_night";
  if (/wedding/.test(normalized)) return "wedding_guest";
  if (/rain/.test(normalized)) return "rain_ready";
  if (/warm|hot/.test(normalized)) return "warm_weather";
  if (/cold|winter/.test(normalized)) return "cold_weather";
  return "todays_best";
}

export function scoringWeightsForMode(mode?: string | null): ScoringWeights {
  const normalized = normalizeRecommendationMode(mode);
  return { ...baseWeights, ...(modeWeights[normalized] || {}) };
}

export function modeLabel(mode?: string | null) {
  const normalized = normalizeRecommendationMode(mode);
  const labels: Record<RecommendationMode, string> = {
    todays_best: "Today's Best Look",
    something_different: "Something Different",
    most_comfortable: "Most Comfortable",
    luxury_edit: "Luxury Edit",
    business_ready: "Business Ready",
    smart_casual: "Smart Casual",
    date_night: "Date Night",
    weekend: "Weekend",
    travel_ready: "Travel Ready",
    rain_ready: "Rain Ready",
    minimal: "Minimal",
    statement_look: "Statement Look",
    wedding_guest: "Wedding Guest",
    interview: "Interview",
    dinner: "Dinner",
    warm_weather: "Warm Weather",
    cold_weather: "Cold Weather"
  };
  return labels[normalized];
}
