import { resolveCanonicalOccasionIntent } from "@/lib/recommendation/occasion-intent";

export type SituationContext = {
  occasion: string;
  occasionId: string;
  dressCode: "unknown" | "casual" | "smart_casual" | "cocktail" | "formal" | "black_tie" | "traditional";
  venue: "unknown" | "indoor" | "outdoor" | "mixed";
  activityLevel: "unknown" | "low" | "moderate" | "high";
  walkingRequirement: "unknown" | "low" | "medium" | "high";
  timeOfDay: "unknown" | "morning" | "afternoon" | "evening" | "all_day";
  desiredImpression: string[];
  comfortPriority: "low" | "medium" | "high";
  carryRequirement: string[];
  weatherSensitive: boolean;
  assumptions: string[];
  criticalMissing: string[];
  clarificationQuestion: string | null;
};

export type SituationPatch = Partial<Omit<SituationContext, "occasionId" | "assumptions" | "criticalMissing" | "clarificationQuestion">>;

function match<T extends string>(text: string, entries: Array<[T, RegExp]>, fallback: T): T {
  return entries.find(([, pattern]) => pattern.test(text))?.[0] || fallback;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).slice(0, 8);
}

export function normalizeSituationContext(input: {
  message?: string;
  explicit?: SituationPatch;
  profile?: any;
  weatherAvailable?: boolean;
}): SituationContext {
  const text = String(input.message || "").replace(/\s+/g, " ").trim().slice(0, 800);
  const lower = text.toLowerCase();
  const occasionIntent = resolveCanonicalOccasionIntent(input.explicit?.occasion || text);
  const dressCode: SituationContext["dressCode"] = input.explicit?.dressCode || match<SituationContext["dressCode"]>(lower, [
    ["black_tie", /black[-\s]?tie/], ["cocktail", /cocktail/], ["smart_casual", /smart[-\s]?casual|business[-\s]?casual/],
    ["traditional", /traditional|native|cultural|aso[-\s]?ebi/], ["formal", /formal|gala|ceremony/], ["casual", /casual|relaxed/]
  ], "unknown");
  const venue: SituationContext["venue"] = input.explicit?.venue || match<SituationContext["venue"]>(lower, [
    ["mixed", /indoor.{0,20}outdoor|outdoor.{0,20}indoor/], ["outdoor", /outdoor|outside|garden|beach|rooftop/], ["indoor", /indoor|inside|hotel|restaurant|office/]
  ], "unknown");
  const activityLevel: SituationContext["activityLevel"] = input.explicit?.activityLevel || match<SituationContext["activityLevel"]>(lower, [
    ["high", /danc|hiking|workout|training|very active/], ["moderate", /walking|touring|shopping|commut/], ["low", /seated|sitting|dinner|meeting/]
  ], "unknown");
  const walkingRequirement: SituationContext["walkingRequirement"] = input.explicit?.walkingRequirement || match<SituationContext["walkingRequirement"]>(lower, [
    ["high", /lots? of walking|walk(?:ing)? all day|on my feet|long walk/], ["medium", /walking|commut|touring/], ["low", /little walking|door to door|mostly seated/]
  ], "unknown");
  const timeOfDay: SituationContext["timeOfDay"] = input.explicit?.timeOfDay || match<SituationContext["timeOfDay"]>(lower, [
    ["all_day", /all[-\s]?day|day to night/], ["morning", /morning|brunch/], ["afternoon", /afternoon|lunch/], ["evening", /evening|night|dinner/]
  ], "unknown");
  const desiredImpression = unique([
    ...(input.explicit?.desiredImpression || []),
    ...(["polished", "relaxed", "minimal", "bold", "professional", "romantic", "creative", "understated"]
      .filter((value) => lower.includes(value)))
  ]);
  const carryRequirement = unique([
    ...(input.explicit?.carryRequirement || []),
    ...(["laptop", "documents", "phone", "essentials", "baby items", "travel documents"]
      .filter((value) => lower.includes(value)))
  ]);
  const profileWalking = input.profile?.lifestyle?.walkingPriority;
  const comfortPriority = input.explicit?.comfortPriority ||
    (walkingRequirement === "high" || activityLevel === "high" ? "high" : input.profile?.comfortPriority || profileWalking || "medium");
  const weatherSensitive = Boolean(input.explicit?.weatherSensitive ?? (venue === "outdoor" || /weather|rain|cold|hot|warm|wind|snow|summer|winter/.test(lower)));
  const assumptions: string[] = [];
  if (dressCode === "unknown") assumptions.push(`Using the standard ${occasionIntent.label.toLowerCase()} dress code.`);
  if (venue === "unknown") assumptions.push("Assuming a primarily indoor setting.");
  if (walkingRequirement === "unknown") assumptions.push("Assuming ordinary walking requirements.");

  const criticalMissing: string[] = [];
  let clarificationQuestion: string | null = null;
  // Ask only when the ambiguity can produce materially different outfit architecture.
  if (/\b(event|party|function)\b/i.test(text) && !occasionIntent.detected && dressCode === "unknown") {
    criticalMissing.push("dressCode");
    clarificationQuestion = "What is the event and its dress code—casual, cocktail, formal, or traditional?";
  } else if (/\b(pack|packing|trip|travel)\b/i.test(text) && !/\b(day|days|week|weeks|destination|going to|in [a-z])/i.test(text)) {
    criticalMissing.push("tripDetails");
    clarificationQuestion = "Where are you going, for how long, and what activities should I plan for?";
  } else if (weatherSensitive && !input.weatherAvailable && !/\b\d{1,2}\s?°|rain|cold|hot|warm|wind|snow/i.test(text)) {
    criticalMissing.push("weatherLocation");
    clarificationQuestion = "What city should I use for the weather, or would you prefer to continue without weather guidance?";
  }

  return {
    occasion: input.explicit?.occasion || occasionIntent.label,
    occasionId: occasionIntent.id,
    dressCode,
    venue,
    activityLevel,
    walkingRequirement,
    timeOfDay,
    desiredImpression,
    comfortPriority,
    carryRequirement,
    weatherSensitive,
    assumptions,
    criticalMissing,
    clarificationQuestion
  };
}

export function applySituationToStyleProfile(profile: any, situation: SituationContext) {
  const contextual = (profile?.contextualPreferences || []).find((entry: any) =>
    String(entry.occasion || "").toLowerCase().includes(situation.occasionId) ||
    situation.occasion.toLowerCase().includes(String(entry.occasion || "").toLowerCase())
  );
  return {
    ...(profile || {}),
    preferredFits: unique([...(contextual?.preferredFits || []), ...(profile?.preferredFits || [])]),
    favoriteColors: unique([...(contextual?.preferredColors || []), ...(profile?.favoriteColors || [])]),
    comfortPriority: situation.comfortPriority || contextual?.comfortPriority || profile?.comfortPriority,
    activeSituation: situation
  };
}
