import { z } from "zod";

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  avatarUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  timezone: z.string().trim().min(1).max(80).optional().or(z.literal("")),
  locale: z.string().trim().min(2).max(20).optional().or(z.literal("")),
  weatherLocationName: z.string().trim().max(120).optional().or(z.literal("")),
  weatherLatitude: z.number().min(-90).max(90).nullable().optional(),
  weatherLongitude: z.number().min(-180).max(180).nullable().optional(),
  modelSetupCompleted: z.boolean().optional()
});

export const deleteRequestSchema = z.object({
  reason: z.string().trim().max(240).optional()
});
