export type ProgressiveTriggerId =
  | "FIRST_VIRTUAL_TRYON_MODEL_REQUIRED"
  | "WEATHER_VALUE_DISCOVERED"
  | "CALENDAR_VALUE_DISCOVERED"
  | "TRAVEL_PACKING_STARTED"
  | "WARDROBE_GAP_HIGH_IMPACT"
  | "UNUSED_ITEM_ROTATION"
  | "STYLE_PROFILE_LOW_CONFIDENCE"
  | "FULL_BODY_PHOTO_NEEDED"
  | "NOTIFICATIONS_VALUE_DEMONSTRATED";

export type ProgressiveTrigger = {
  id: ProgressiveTriggerId;
  priority: number;
  cooldownDays: number;
  maxFrequency: number;
  requiredData: string[];
  value: string;
  title: string;
  body: string;
  primaryAction: string;
  secondaryAction?: string;
};

export const progressiveTriggers: Record<ProgressiveTriggerId, ProgressiveTrigger> = {
  FIRST_VIRTUAL_TRYON_MODEL_REQUIRED: {
    id: "FIRST_VIRTUAL_TRYON_MODEL_REQUIRED",
    priority: 100,
    cooldownDays: 14,
    maxFrequency: 3,
    requiredData: ["uploaded full-body photo", "preview consent"],
    value: "Unlock realistic outfit previews only when the user asks for try-on.",
    title: "Add your full-body photo",
    body: "To create Virtual Try-On previews, MyFitPick needs a clear full-body photo where your head, outfit area, and feet are visible.",
    primaryAction: "Upload full-body photo",
    secondaryAction: "Continue without try-on"
  },
  FULL_BODY_PHOTO_NEEDED: {
    id: "FULL_BODY_PHOTO_NEEDED",
    priority: 90,
    cooldownDays: 14,
    maxFrequency: 3,
    requiredData: ["full-body image consent"],
    value: "Improve the virtual try-on the user just requested.",
    title: "Add a full-body photo",
    body: "A full-body image helps MyFitPick create a cleaner virtual try-on. Ordinary outfit recommendations still work without it.",
    primaryAction: "Upload full-body photo",
    secondaryAction: "Not now"
  },
  WEATHER_VALUE_DISCOVERED: {
    id: "WEATHER_VALUE_DISCOVERED",
    priority: 60,
    cooldownDays: 21,
    maxFrequency: 3,
    requiredData: ["city or location permission"],
    value: "Improve the weather-aware recommendation the user requested.",
    title: "Add weather context",
    body: "I can adapt recommendations to temperature and rain forecast if you enter your city or use current location.",
    primaryAction: "Add city",
    secondaryAction: "Continue without weather"
  },
  CALENDAR_VALUE_DISCOVERED: {
    id: "CALENDAR_VALUE_DISCOVERED",
    priority: 50,
    cooldownDays: 30,
    maxFrequency: 2,
    requiredData: ["calendar permission"],
    value: "Prepare looks for upcoming events after the user asks for occasion planning.",
    title: "Prepare for upcoming events",
    body: "MyFitPick can plan looks for meetings, weddings, and events if you connect a calendar. Manual occasion entry still works.",
    primaryAction: "Connect calendar",
    secondaryAction: "Enter occasion manually"
  },
  TRAVEL_PACKING_STARTED: {
    id: "TRAVEL_PACKING_STARTED",
    priority: 55,
    cooldownDays: 7,
    maxFrequency: 4,
    requiredData: ["destination", "dates", "trip purpose"],
    value: "Create packing recommendations for the trip the user started.",
    title: "Plan your trip wardrobe",
    body: "Destination, dates, activities, and luggage limits help MyFitPick build a practical packing list from your closet.",
    primaryAction: "Add trip details",
    secondaryAction: "Plan manually"
  },
  WARDROBE_GAP_HIGH_IMPACT: {
    id: "WARDROBE_GAP_HIGH_IMPACT",
    priority: 45,
    cooldownDays: 14,
    maxFrequency: 4,
    requiredData: ["wardrobe gap insight"],
    value: "Explain a real wardrobe gap that unlocks more outfits.",
    title: "A high-impact closet gap",
    body: "MyFitPick found one addition that would unlock noticeably more outfit combinations.",
    primaryAction: "See insight",
    secondaryAction: "Dismiss"
  },
  UNUSED_ITEM_ROTATION: {
    id: "UNUSED_ITEM_ROTATION",
    priority: 40,
    cooldownDays: 10,
    maxFrequency: 4,
    requiredData: ["unused item", "compatible occasion"],
    value: "Rotate suitable neglected pieces back into recommendations.",
    title: "Bring back an unused piece",
    body: "One suitable item has not appeared in recent looks. MyFitPick can build around it today.",
    primaryAction: "Style this piece",
    secondaryAction: "Not today"
  },
  STYLE_PROFILE_LOW_CONFIDENCE: {
    id: "STYLE_PROFILE_LOW_CONFIDENCE",
    priority: 35,
    cooldownDays: 21,
    maxFrequency: 3,
    requiredData: ["low style confidence dimension"],
    value: "Ask one preference question only when it improves the next recommendation.",
    title: "Refine your Style DNA",
    body: "One quick preference can help MyFitPick make your next recommendation feel closer to you.",
    primaryAction: "Answer one question",
    secondaryAction: "Later"
  },
  NOTIFICATIONS_VALUE_DEMONSTRATED: {
    id: "NOTIFICATIONS_VALUE_DEMONSTRATED",
    priority: 25,
    cooldownDays: 30,
    maxFrequency: 2,
    requiredData: ["demonstrated reminder value"],
    value: "Ask for notification permission only after showing a useful reminder case.",
    title: "Get useful style reminders",
    body: "MyFitPick can remind you about weather-ready outfits, care, packing, or upcoming occasions when you choose.",
    primaryAction: "Choose reminders",
    secondaryAction: "Not now"
  }
};

export function triggerForVirtualTryOn(avatarProfile?: any) {
  const hasModel = Boolean(avatarProfile?.uploadedModelImageUrl);
  const hasConsent = Boolean(avatarProfile?.consentAccepted);
  if (hasModel && hasConsent) return null;
  return progressiveTriggers.FIRST_VIRTUAL_TRYON_MODEL_REQUIRED;
}

export function triggerForWeatherValue(user?: any, message = "") {
  const weatherSensitive = /weather|rain|hot|cold|temperature|today|tomorrow|forecast|humid|wind/i.test(message);
  const hasWeatherContext = Boolean(user?.weatherLocationName || (typeof user?.weatherLatitude === "number" && typeof user?.weatherLongitude === "number"));
  return weatherSensitive && !hasWeatherContext ? progressiveTriggers.WEATHER_VALUE_DISCOVERED : null;
}

export function serializeProgressiveTrigger(trigger?: ProgressiveTrigger | null) {
  if (!trigger) return null;
  return {
    id: trigger.id,
    title: trigger.title,
    body: trigger.body,
    primaryAction: trigger.primaryAction,
    secondaryAction: trigger.secondaryAction || "Not now",
    value: trigger.value
  };
}
