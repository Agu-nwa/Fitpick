import { z } from "zod";

const situationSchema = z.object({
  occasion: z.string().trim().max(120).optional(),
  dressCode: z.enum(["unknown", "casual", "smart_casual", "cocktail", "formal", "black_tie", "traditional"]).optional(),
  venue: z.enum(["unknown", "indoor", "outdoor", "mixed"]).optional(),
  activityLevel: z.enum(["unknown", "low", "moderate", "high"]).optional(),
  walkingRequirement: z.enum(["unknown", "low", "medium", "high"]).optional(),
  timeOfDay: z.enum(["unknown", "morning", "afternoon", "evening", "all_day"]).optional(),
  desiredImpression: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
  comfortPriority: z.enum(["low", "medium", "high"]).optional(),
  carryRequirement: z.array(z.string().trim().min(1).max(60)).max(8).optional(),
  weatherSensitive: z.boolean().optional()
}).strict();

export const stylistPlanCreateSchema = z.object({
  type: z.enum(["weekly", "capsule", "packing"]),
  title: z.string().trim().min(2).max(120).optional(),
  days: z.number().int().min(1).max(14).default(5),
  occasions: z.array(z.string().trim().min(2).max(80)).min(1).max(14).default(["Everyday"]),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  destination: z.string().trim().max(120).optional(),
  weatherContext: z.string().trim().max(240).optional(),
  formality: z.enum(["relaxed", "balanced", "polished", "formal"]).optional(),
  styleDirection: z.enum(["simple", "polished", "bold", "statement", "weather-safe", "comfortable"]).optional(),
  allowNeedsCare: z.boolean().default(false),
  situation: situationSchema.optional()
}).strict();
