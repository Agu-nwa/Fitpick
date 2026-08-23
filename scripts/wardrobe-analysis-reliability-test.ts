import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const analysisSource = fs.readFileSync(path.join(root, "lib/ai/wardrobe-analysis.ts"), "utf8");
const handlerSource = fs.readFileSync(path.join(root, "lib/jobs/handlers.ts"), "utf8");

assert.match(analysisSource, /text:\s*\{\s*format:\s*\{\s*type:\s*"json_object"/, "wardrobe vision must request JSON-constrained output");
assert.match(analysisSource, /failureStage = "json_parse"/, "wardrobe analysis must distinguish JSON parsing failures");
assert.match(analysisSource, /failureStage = "schema_validation"/, "wardrobe analysis must distinguish schema failures");
assert.match(handlerSource, /if \(!result\.ok \|\| !result\.suggestedTags\)/, "failed wardrobe analysis must not complete its background job");
assert.match(handlerSource, /throw failure;/, "failed wardrobe analysis must enter queue retry handling");

console.log("wardrobe analysis reliability tests passed");
