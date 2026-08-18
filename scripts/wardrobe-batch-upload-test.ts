import assert from "node:assert/strict";
import {
  WARDROBE_BATCH_MAX_BYTES,
  validateWardrobeBatchCandidates,
  type WardrobeBatchCandidate
} from "../lib/wardrobe/batch-upload";
import { wardrobeUploadBatchSchema } from "../schemas/wardrobe.schema";
import { perceptualHashDistance } from "../lib/image-processing/perceptual-hash";
import { WardrobeUpload } from "../models/WardrobeUpload";

const id = (suffix: string) => `${"0".repeat(23)}${suffix}`;
const candidate = (suffix: string, overrides: Partial<WardrobeBatchCandidate> = {}): WardrobeBatchCandidate => ({
  id: id(suffix),
  sizeBytes: 1_000_000,
  sourceImageHash: suffix.repeat(64),
  uploadStatus: "uploaded",
  ...overrides
});

assert.equal(wardrobeUploadBatchSchema.safeParse({ uploadIds: [id("1")] }).success, false, "a batch must contain at least two items");
assert.equal(wardrobeUploadBatchSchema.safeParse({ uploadIds: [id("1"), id("2"), id("3"), id("4"), id("5"), id("6")] }).success, false, "a batch must contain no more than five items");
assert.equal(validateWardrobeBatchCandidates([candidate("1"), candidate("2")]).ok, true, "separate uploaded photos should be accepted");

const duplicateId = validateWardrobeBatchCandidates([candidate("1"), candidate("1", { sourceImageHash: "2".repeat(64) })]);
assert.deepEqual(duplicateId.ok ? null : duplicateId.code, "duplicate_id", "the same upload record must not appear twice");

const duplicatePhoto = validateWardrobeBatchCandidates([candidate("1"), candidate("2", { sourceImageHash: "1".repeat(64) })]);
assert.deepEqual(duplicatePhoto.ok ? null : duplicatePhoto.code, "duplicate_photo", "identical photo bytes must be rejected");

const confirmed = validateWardrobeBatchCandidates([candidate("1"), candidate("2", { createdItemId: id("9") })]);
assert.deepEqual(confirmed.ok ? null : confirmed.code, "invalid_state", "confirmed closet items must not be batched again");

const oversized = validateWardrobeBatchCandidates([
  candidate("1", { sizeBytes: WARDROBE_BATCH_MAX_BYTES }),
  candidate("2", { sizeBytes: 1 })
]);
assert.deepEqual(oversized.ok ? null : oversized.code, "too_large", "the normalized batch byte limit must be enforced");
assert.equal(perceptualHashDistance("0000000000000000", "0000000000000001"), 1, "perceptual distance should count changed bits");
assert.equal(perceptualHashDistance("0000000000000000", "ffffffffffffffff"), 64, "completely different fingerprints should remain distant");

const uncategorizedDraft = new WardrobeUpload({
  userId: id("1"),
  storageKey: `wardrobe/${id("1")}/wardrobe_original-test.webp`,
  selectedCategory: "",
  uploadStatus: "uploaded"
});
assert.equal(
  uncategorizedDraft.validateSync()?.errors.selectedCategory,
  undefined,
  "a new upload must allow an empty category until AI analysis and user review"
);

console.log("wardrobe batch upload tests passed");
