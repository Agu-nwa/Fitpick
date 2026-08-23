import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { prepareWardrobeAnalysisCandidate } from "../lib/ai/wardrobe-analysis";
import { aiTaggingResultSchema } from "../schemas/ai-tagging.schema";
import { validateJsonResponse } from "../lib/ai/validation/response-validator";

const root = process.cwd();
const analysisSource = fs.readFileSync(path.join(root, "lib/ai/wardrobe-analysis.ts"), "utf8");
const handlerSource = fs.readFileSync(path.join(root, "lib/jobs/handlers.ts"), "utf8");
const confirmSource = fs.readFileSync(path.join(root, "components/wardrobe/WardrobeUploadConfirmClient.tsx"), "utf8");
const formSource = fs.readFileSync(path.join(root, "components/wardrobe/AITagConfirmationForm.tsx"), "utf8");

assert.match(analysisSource, /text:\s*\{\s*format:\s*\{\s*type:\s*"json_object"/, "wardrobe vision must request JSON-constrained output");
assert.match(analysisSource, /failureStage = "json_parse"/, "wardrobe analysis must distinguish JSON parsing failures");
assert.match(analysisSource, /failureStage = "schema_validation"/, "wardrobe analysis must distinguish schema failures");
assert.match(handlerSource, /if \(!result\.ok \|\| !result\.suggestedTags\)/, "failed wardrobe analysis must not complete its background job");
assert.match(handlerSource, /throw failure;/, "failed wardrobe analysis must enter queue retry handling");
assert.doesNotMatch(confirmSource, /WardrobeImageSlots/, "manual confirmation must not repeat front, back, fabric, or label photo slots");
assert.match(confirmSource, /manualMode=\{Boolean\(batchId\) \|\| !upload\.aiAnalysis\}/, "failed and batch reviews must use the direct manual form");
assert.match(formSource, /useState\(manualMode\)/, "manual review details must be open immediately");

const prepared = prepareWardrobeAnalysisCandidate({
  fields: {
    category: { value: "shoes", confidence: 0.9, source: "vision" },
    formalityScore: { value: ["polished", "formal"], confidence: 0.8, source: "system_inferred" },
    luxuryScore: { value: 0.75, confidence: 0.7, source: "system_inferred" }
  },
  categorySpecificMetadata: { shoeStyle: "loafer", heelHeight: 4, unrelated: "discard" },
  categorySpecificMetadataConfidence: { shoeStyle: 0.9, heelHeight: 4, invalid: "unknown" }
}, "shoes") as any;
assert.equal(prepared.fields.formalityScore.value, "polished, formal", "list-like formality evidence must be normalized before validation");
assert.equal(prepared.fields.luxuryScore.value, "0.75", "numeric score evidence must be normalized before validation");
assert.equal(prepared.categorySpecificMetadata.heelHeight, "4", "numeric category evidence must be preserved safely as text");
assert.equal(prepared.categorySpecificMetadata.unrelated, undefined, "irrelevant category attributes must be discarded");
assert.equal(prepared.categorySpecificMetadataConfidence.heelHeight, 1, "category confidence must be clamped");
assert.equal(aiTaggingResultSchema.parse({ ok: false, provider: "openai", aiTagStatus: "failed", failureCode: "schema_validation" }).failureCode, "schema_validation", "failure stage must survive result validation");
const invalidResult = validateJsonResponse(aiTaggingResultSchema, { ok: "no", provider: "openai", aiTagStatus: "failed" });
assert.match(invalidResult.ok ? "" : invalidResult.reason, /ok:invalid_type/, "schema diagnostics must expose a safe field path and issue code");

console.log("wardrobe analysis reliability tests passed");
