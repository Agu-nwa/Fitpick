import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/image-upload-policy";

export const WARDROBE_BATCH_MIN_ITEMS = 2;
export const WARDROBE_BATCH_MAX_ITEMS = 10;
// Every candidate has already passed the single-image normalization limit before batching.
export const WARDROBE_BATCH_MAX_BYTES = WARDROBE_BATCH_MAX_ITEMS * MAX_IMAGE_UPLOAD_BYTES;

export type WardrobeBatchCandidate = {
  id: string;
  sizeBytes?: number | null;
  sourceImageHash?: string | null;
  perceptualImageHash?: string | null;
  uploadStatus: string;
  createdItemId?: unknown;
  batchId?: unknown;
};

export type WardrobeBatchValidation =
  | { ok: true; totalBytes: number; hashes: string[] }
  | { ok: false; code: "count" | "duplicate_id" | "invalid_state" | "too_large" | "duplicate_photo"; message: string };

export function validateWardrobeBatchCandidates(candidates: WardrobeBatchCandidate[]): WardrobeBatchValidation {
  if (candidates.length < WARDROBE_BATCH_MIN_ITEMS || candidates.length > WARDROBE_BATCH_MAX_ITEMS) {
    return { ok: false, code: "count", message: "Choose between 2 and 10 separate closet items." };
  }

  const ids = candidates.map((candidate) => candidate.id);
  if (new Set(ids).size !== ids.length) {
    return { ok: false, code: "duplicate_id", message: "Each photo can only appear once in a batch." };
  }

  if (candidates.some((candidate) => candidate.createdItemId || candidate.batchId || candidate.uploadStatus !== "uploaded")) {
    return { ok: false, code: "invalid_state", message: "One or more photos cannot be added to this batch." };
  }

  const totalBytes = candidates.reduce((sum, candidate) => sum + Number(candidate.sizeBytes || 0), 0);
  if (totalBytes > WARDROBE_BATCH_MAX_BYTES) {
    return { ok: false, code: "too_large", message: "Each prepared photo must be under 50 MB. Choose fewer or smaller photos." };
  }

  const hashes = candidates
    .map((candidate) => candidate.sourceImageHash)
    .filter((hash): hash is string => Boolean(hash));
  if (new Set(hashes).size !== hashes.length) {
    return { ok: false, code: "duplicate_photo", message: "The same photo was selected more than once." };
  }

  return { ok: true, totalBytes, hashes };
}
