import { z } from "zod";

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier.");

export const safeShortText = (max = 160) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim());

export const safeTagList = (maxItems = 20, maxLength = 60) =>
  z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(maxLength)
        .transform((value) => value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim())
    )
    .max(maxItems)
    .transform((values) => Array.from(new Set(values.map((value) => value.toLowerCase()))));
