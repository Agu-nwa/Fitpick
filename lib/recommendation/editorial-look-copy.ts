import type { OutfitRecommendation } from "@/types/outfit";

type EditorialLookCopy = {
  title: string;
  supportingCopy: string;
};

const intentCopy: Record<string, EditorialLookCopy> = {
  work: {
    title: "Workday Polish",
    supportingCopy: "A refined look for the working day."
  },
  business: {
    title: "Sharp Office Ease",
    supportingCopy: "Clean lines with effortless professionalism."
  },
  casual: {
    title: "Off-Duty Ease",
    supportingCopy: "Relaxed pieces styled with intention."
  },
  weekend: {
    title: "Weekend Layers",
    supportingCopy: "Easy dressing for slower days."
  },
  smartCasual: {
    title: "Smart Ease",
    supportingCopy: "Relaxed enough for day, polished enough for plans."
  },
  dinner: {
    title: "Dinner Ready",
    supportingCopy: "An easy evening look with a polished finish."
  },
  date: {
    title: "Evening Ease",
    supportingCopy: "Softly dressed up, confident and effortless."
  },
  party: {
    title: "After Dark",
    supportingCopy: "Elevated style with a confident finish."
  },
  weddingGuest: {
    title: "Guest Ready",
    supportingCopy: "Occasion-ready style with a refined finish."
  },
  formal: {
    title: "Formal Finish",
    supportingCopy: "A sharper look for a more dressed-up moment."
  },
  travel: {
    title: "Travel Light",
    supportingCopy: "Comfortable pieces that stay polished on the move."
  },
  vacation: {
    title: "Holiday Ease",
    supportingCopy: "Light, effortless dressing for time away."
  },
  church: {
    title: "Sunday Polish",
    supportingCopy: "Clean, respectful and neatly put together."
  },
  brunch: {
    title: "Weekend Brunch",
    supportingCopy: "Relaxed sophistication for an easy afternoon."
  },
  interview: {
    title: "Interview Ready",
    supportingCopy: "Smart dressing with quiet confidence."
  },
  rain: {
    title: "Rain Ready",
    supportingCopy: "Practical layers without compromising style."
  },
  coldWeather: {
    title: "Winter Layers",
    supportingCopy: "Warm, balanced and thoughtfully styled."
  },
  summer: {
    title: "Summer Light",
    supportingCopy: "Breathable pieces with effortless polish."
  },
  unknown: {
    title: "Styled Look",
    supportingCopy: "A complete outfit thoughtfully put together."
  }
};

function textForIntent(outfit: OutfitRecommendation) {
  const runtimeOutfit = outfit as OutfitRecommendation & { weatherContext?: string };
  return [
    runtimeOutfit.recommendationMode,
    runtimeOutfit.occasion,
    runtimeOutfit.weatherContext,
    runtimeOutfit.title,
    runtimeOutfit.styleIntent,
    runtimeOutfit.summary,
    runtimeOutfit.occasionFit,
    runtimeOutfit.weatherFit
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function detectIntent(outfit: OutfitRecommendation) {
  const text = textForIntent(outfit);

  if (/interview/.test(text)) return "interview";
  if (/wedding|guest|ceremony|reception/.test(text)) return "weddingGuest";
  if (/church|sunday|service/.test(text)) return "church";
  if (/date|romantic/.test(text)) return "date";
  if (/dinner|restaurant|evening meal/.test(text)) return "dinner";
  if (/party|club|after dark|night out/.test(text)) return "party";
  if (/smart casual/.test(text)) return "smartCasual";
  if (/business|office|meeting|professional/.test(text)) return "business";
  if (/work|workday/.test(text)) return "work";
  if (/formal|black tie|gala|dressy/.test(text)) return "formal";
  if (/brunch/.test(text)) return "brunch";
  if (/weekend/.test(text)) return "weekend";
  if (/vacation|holiday|resort|beach/.test(text)) return "vacation";
  if (/travel|airport|flight|journey/.test(text)) return "travel";
  if (/rain|shower|wet/.test(text)) return "rain";
  if (/cold|winter|chilly|snow/.test(text)) return "coldWeather";
  if (/summer|hot|warm|sunny/.test(text)) return "summer";
  if (/casual|relaxed|off[- ]?duty/.test(text)) return "casual";

  return "unknown";
}

export function editorialLookCopy(outfit: OutfitRecommendation): EditorialLookCopy {
  return intentCopy[detectIntent(outfit)] || intentCopy.unknown;
}
