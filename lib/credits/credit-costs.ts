export const INITIAL_COMPLIMENTARY_CREDITS = 20;

export const creditCosts = {
  ai_stylist_chat: {
    label: "AI Stylist Chat",
    credits: 2,
    description: "A successful wardrobe-grounded AI stylist response."
  },
  outfit_preview: {
    label: "Premium Outfit Preview",
    credits: 5,
    description: "A successful AI-generated outfit image preview."
  },
  virtual_try_on: {
    label: "Virtual Try-On",
    credits: 5,
    description: "A successful avatar or virtual try-on preview."
  },
  regenerate_try_on: {
    label: "Regenerate Try-On",
    credits: 5,
    description: "A successful regenerated avatar or outfit preview."
  }
} as const;

export type CreditFeature = keyof typeof creditCosts;

export const alwaysFreeFeatures = [
  "Email OTP authentication",
  "Wardrobe uploads",
  "AI wardrobe tagging",
  "Manual editing",
  "Wardrobe organization",
  "Basic outfit recommendations",
  "Weather-aware suggestions",
  "Occasion suggestions",
  "Style calendar",
  "Outfit history",
  "Favorites"
];

export function getCreditFeature(feature: CreditFeature) {
  return creditCosts[feature];
}

export function isCreditFeature(feature: unknown): feature is CreditFeature {
  return typeof feature === "string" && feature in creditCosts;
}

export function getCreditCost(feature: CreditFeature) {
  return creditCosts[feature].credits;
}

export function serializeCreditCosts() {
  return Object.entries(creditCosts).map(([feature, config]) => ({
    feature,
    ...config
  }));
}
