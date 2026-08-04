import assert from "node:assert/strict";
import { errorCategory } from "../lib/ai/observability/ai-logger";
import { safeErrorCategory } from "../lib/security/safe-log";

for (const message of ["Unable to generate preview", "Generation failed", "Image generation provider error"]) {
  assert.notEqual(safeErrorCategory(new Error(message)), "rate_limit", `${message} is not a rate-limit error`);
  assert.notEqual(errorCategory(new Error(message)), "rate_limit", `${message} is not an AI rate-limit error`);
}
for (const error of [new Error("Too many requests"), new Error("HTTP 429"), new Error("Quota exceeded"), Object.assign(new Error("provider rejected request"), { statusCode: 429 })]) {
  assert.equal(safeErrorCategory(error), "rate_limit");
  assert.equal(errorCategory(error), "rate_limit");
}

console.log("Safe-log classification tests passed.");
