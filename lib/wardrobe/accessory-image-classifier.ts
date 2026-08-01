import crypto from "node:crypto";
import { accessorySubtypeValues, type AccessorySubtype } from "@/lib/wardrobe/accessory-subtypes";

export const accessoryImageClassifierVersion = "accessory-image-v1";
export type AccessoryImageClassification = { subtype: AccessorySubtype | null; confidence: number; visibleEvidence: string[]; alternatives: Array<{ subtype: AccessorySubtype; confidence: number }> };
type Classifier = (input: { image: Buffer; timeoutMs: number }) => Promise<AccessoryImageClassification>;
const cache = new Map<string, AccessoryImageClassification>();

export function accessoryImageClassificationEnabled() {
  return process.env.ENABLE_ACCESSORY_IMAGE_CLASSIFICATION === "true";
}

export async function classifyAccessoryImage(input: { image: Buffer; classifier: Classifier; requestBudget: { used: number; maximum: number }; timeoutMs?: number; enabled?: boolean }) {
  if (!(input.enabled ?? accessoryImageClassificationEnabled())) return { status: "disabled" as const, result: null, cacheHit: false };
  const fingerprint = crypto.createHash("sha256").update(accessoryImageClassifierVersion).update(input.image).digest("hex");
  const cached = cache.get(fingerprint);
  if (cached) return { status: "completed" as const, result: cached, cacheHit: true };
  if (input.requestBudget.used >= input.requestBudget.maximum) return { status: "budget-exhausted" as const, result: null, cacheHit: false };
  input.requestBudget.used += 1;
  try {
    const timeoutMs = Math.min(Math.max(input.timeoutMs || 10_000, 1_000), 15_000);
    const result = await Promise.race([
      input.classifier({ image: input.image, timeoutMs }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("classifier_timeout")), timeoutMs))
    ]);
    const subtype = result.subtype && accessorySubtypeValues.includes(result.subtype) ? result.subtype : null;
    const safe = { subtype, confidence: Math.min(1, Math.max(0, result.confidence)), visibleEvidence: result.visibleEvidence.slice(0, 4).map((entry) => entry.slice(0, 100)), alternatives: result.alternatives.filter((entry) => accessorySubtypeValues.includes(entry.subtype)).slice(0, 3) };
    cache.set(fingerprint, safe);
    return { status: "completed" as const, result: safe, cacheHit: false };
  } catch {
    return { status: "failed" as const, result: null, cacheHit: false };
  }
}

export function clearAccessoryImageClassificationCacheForTests() {
  cache.clear();
}
