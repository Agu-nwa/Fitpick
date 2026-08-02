import assert from "node:assert/strict";
import fs from "node:fs";

const backfill = fs.readFileSync("scripts/backfill-styling-metadata.ts", "utf8");
const audit = fs.readFileSync("scripts/audit-wardrobe-taxonomy.ts", "utf8");
const calibration = fs.readFileSync("scripts/analyze-recommendation-diagnostics.ts", "utf8");
assert.ok(backfill.includes('process.argv.includes("--write")'), "37 write mode requires explicit flag");
assert.ok(backfill.includes('metadataSources?.[field] === "user"'), "38 user-confirmed metadata is skipped");
assert.ok(backfill.includes('write ? "write" : "dry-run"'), "36 backfill defaults to dry-run");
assert.ok(!backfill.includes("analyzeWardrobeImages") && !backfill.includes("imageUrl"), "39 backfill does not inspect images or guess jewelry");
assert.ok(audit.includes('mode: "read_only_aggregate"'), "40 audit is aggregate by default");
assert.ok(!audit.includes("item.name") && !audit.includes("imageUrl") && !audit.includes("userId:"), "41 audit output excludes names, image URLs and raw user IDs");
assert.ok(calibration.includes("thresholdsModified: false") && !calibration.includes("writeFile"), "42 calibration never mutates thresholds");
console.log("Audit and calibration tooling checks passed.");
