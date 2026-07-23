import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("components/outfit/LookPreviewClient.tsx", "utf8");

for (const removedCopy of [
  "Why it works",
  "Try another look",
  "Regenerate try-on",
  "Edit avatar",
  "materialNote",
  "silhouetteNote",
  "visualizationWarnings",
  "fitWarnings",
  "Preview needs review",
  "Grounded preview",
  "Add missing shoes"
]) {
  assert.ok(!source.includes(removedCopy), `Full preview page must not expose ${removedCopy}.`);
}

assert.ok(source.includes("isPreviewReady"), "Preview page must derive a completed state.");
assert.ok(source.includes("isPreviewProcessing"), "Preview page must derive a processing state.");
assert.ok(source.includes("isPreviewFailed"), "Preview page must derive a failed state.");
assert.ok(source.includes("Save Look"), "Completed preview must offer Save Look.");
assert.ok(source.includes("PreviewDownloadButton"), "Completed preview must offer Download Preview.");
assert.ok(source.includes("Virtual Try-On couldn't be completed."), "Failed preview must show the approved failure copy.");
assert.ok(source.includes("Retry Try-On"), "Failed preview must offer Retry Try-On.");
assert.ok(source.includes("handleGenerate(true)"), "Retry must start a new generation.");
assert.ok(source.includes('idempotencyKey: createClientIdempotencyKey("avatar-preview")'), "Retry must use a fresh client idempotency key.");
assert.ok(source.includes("previewProcessing"), "Processing state must hide irrelevant actions.");

console.log("Try-on preview UI state check passed.");
