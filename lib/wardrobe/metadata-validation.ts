import { z } from "zod";
import type { WardrobeCategory } from "@/types/wardrobe";
import { accessoryRoles, specificFieldsForCategory } from "@/lib/wardrobe/category-attribute-profiles";

const metadataValueSchema = z.union([
  z.string().trim().max(160),
  z.boolean(),
  z.null(),
  z.array(z.string().trim().max(80)).max(20)
]);

export const categorySpecificMetadataSchema = z.record(metadataValueSchema).default({});

function cleanValue(value: unknown) {
  if (typeof value === "string") {
    const text = value.trim().slice(0, 160);
    return text || null;
  }
  if (typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) {
    const list = value.map((entry) => String(entry || "").trim().slice(0, 80)).filter(Boolean).slice(0, 20);
    return list.length ? list : null;
  }
  return null;
}

export function sanitizeCategorySpecificMetadata(input: unknown, category?: WardrobeCategory | string) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};

  const allowed = new Set(specificFieldsForCategory(category));
  const output: Record<string, string | string[] | boolean | null> = {};

  for (const [key, rawValue] of Object.entries(input as Record<string, unknown>)) {
    if (!allowed.has(key)) continue;
    const value = cleanValue(rawValue);
    if (value === null) continue;
    if (key === "role") {
      const role = String(value).trim().toLowerCase();
      output.role = accessoryRoles.includes(role as any) ? role : "other";
      continue;
    }
    output[key] = value;
  }

  return output;
}

export function validateCategorySpecificMetadata(input: unknown, category?: WardrobeCategory | string) {
  const sanitized = sanitizeCategorySpecificMetadata(input, category);
  return categorySpecificMetadataSchema.parse(sanitized);
}
