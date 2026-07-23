import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier.");

export const outfitRecommendationRequestSchema = z.object({
  occasionId: objectId.optional(),
  customOccasion: z
    .object({
      name: z.string().trim().min(2).max(80),
      group: z.enum(["everyday", "work", "formal", "social", "event", "weather", "travel"]).optional(),
      formality: z.enum(["relaxed", "balanced", "polished", "formal"]).optional()
    })
    .optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  weatherLocation: z.string().trim().max(120).optional(),
  occasionName: z.string().trim().min(2).max(80).optional(),
  formality: z.enum(["relaxed", "balanced", "polished", "formal"]).optional(),
  weatherContext: z.string().trim().max(120).optional(),
  constraints: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  allowNeedsCare: z.boolean().optional(),
  styleDirection: z.enum(["simple", "polished", "bold", "statement", "weather-safe", "comfortable"]).optional(),
  recommendationMode: z
    .enum([
      "todays_best",
      "something_different",
      "most_comfortable",
      "luxury_edit",
      "business_ready",
      "smart_casual",
      "date_night",
      "weekend",
      "travel_ready",
      "rain_ready",
      "minimal",
      "statement_look",
      "wedding_guest",
      "interview",
      "dinner",
      "warm_weather",
      "cold_weather"
    ])
    .optional()
});

export const outfitIdSchema = z.object({
  id: objectId
});

export const swapOutfitSchema = z.object({
  itemIdToReplace: objectId,
  replacementItemId: objectId.optional(),
  category: z.string().trim().max(60).optional(),
  swapDirection: z
    .enum(["best-match", "more-polished", "more-casual", "color-change", "weather-safe", "statement"])
    .optional()
});

export const saveOutfitSchema = z.object({
  title: z.string().trim().max(120).optional(),
  favorite: z.boolean().optional()
});

export const wearOutfitSchema = z.object({
  wornAt: z.string().datetime().optional(),
  rating: z.enum(["Perfect", "Good", "Okay", "Not today", "Not my style"]).optional()
});

export const outfitFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedbackTags: z
    .array(
      z.enum([
        "perfect",
        "good",
        "too-casual",
        "too-formal",
        "wrong-color",
        "not-my-style",
        "not-today",
        "weather-issue",
        "needs-polish"
      ])
    )
    .max(10)
    .optional(),
  note: z.string().trim().max(500).optional()
});
