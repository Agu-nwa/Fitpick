import assert from "node:assert/strict";
import {
  WARDROBE_BATCH_MAX_BYTES,
  validateWardrobeBatchCandidates,
  type WardrobeBatchCandidate
} from "../lib/wardrobe/batch-upload";
import { wardrobeUploadBatchSchema } from "../schemas/wardrobe.schema";
import { MAX_IMAGE_UPLOAD_BYTES } from "../lib/image-upload-policy";
import { perceptualHashDistance } from "../lib/image-processing/perceptual-hash";
import { WardrobeUpload } from "../models/WardrobeUpload";
import { WardrobeUploadBatch } from "../models/WardrobeUploadBatch";
import { appNotificationTypes } from "../models/AppNotification";
import fs from "node:fs";
import path from "node:path";

const id = (suffix: string) => `${"0".repeat(23)}${suffix}`;
const candidate = (suffix: string, overrides: Partial<WardrobeBatchCandidate> = {}): WardrobeBatchCandidate => ({
  id: id(suffix),
  sizeBytes: 1_000_000,
  sourceImageHash: suffix.repeat(64),
  uploadStatus: "uploaded",
  ...overrides
});

assert.equal(wardrobeUploadBatchSchema.safeParse({ uploadIds: [id("1")] }).success, false, "a batch must contain at least two items");
assert.equal(wardrobeUploadBatchSchema.safeParse({ uploadIds: Array.from({ length: 10 }, (_, index) => id(String(index + 1).slice(-1))) }).success, true, "a batch may contain ten items");
assert.equal(wardrobeUploadBatchSchema.safeParse({ uploadIds: Array.from({ length: 11 }, (_, index) => `${String(index + 1).padStart(24, "0")}`) }).success, false, "a batch must contain no more than ten items");
assert.equal(validateWardrobeBatchCandidates([candidate("1"), candidate("2")]).ok, true, "separate uploaded photos should be accepted");
assert.equal(WARDROBE_BATCH_MAX_BYTES, 10 * MAX_IMAGE_UPLOAD_BYTES, "ten-item batches must retain the single-upload allowance for every item");

const tenItemBatch = new WardrobeUploadBatch({
  userId: id("1"),
  uploadIds: Array.from({ length: 10 }, (_, index) => id(String(index + 1).slice(-1))),
  itemCount: 10
});
assert.equal(tenItemBatch.validateSync(), undefined, "the persisted batch model must accept ten items");

const elevenItemBatch = new WardrobeUploadBatch({
  userId: id("1"),
  uploadIds: Array.from({ length: 11 }, (_, index) => String(index + 1).padStart(24, "0")),
  itemCount: 11
});
assert.ok(elevenItemBatch.validateSync()?.errors.itemCount, "the persisted batch model must reject more than ten items");

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

const projectRoot = path.resolve(import.meta.dirname, "..");
const bulkUploadClient = fs.readFileSync(path.join(projectRoot, "components/wardrobe/WardrobeBulkUploadClient.tsx"), "utf8");
const closetClient = fs.readFileSync(path.join(projectRoot, "components/wardrobe/WardrobeListClient.tsx"), "utf8");
const reviewClient = fs.readFileSync(path.join(projectRoot, "components/wardrobe/WardrobeBatchReviewClient.tsx"), "utf8");
assert.ok(bulkUploadClient.includes("/wardrobe?uploadBatch="), "batch upload should return users to the closet instead of trapping them on analysis");
assert.ok(closetClient.includes("You can keep using the app—we’ll prompt you when review is ready."), "closet should explain background analysis");
assert.ok(reviewClient.includes("❗ Review matters"), "review should prominently explain why confirmation matters");
assert.ok(appNotificationTypes.includes("wardrobe_review_ready"), "wardrobe review-ready notifications must be supported");

console.log("wardrobe batch upload tests passed");
