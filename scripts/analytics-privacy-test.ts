import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const analytics = fs.readFileSync(path.join(root, "components/analytics/PrivacySafeAnalytics.tsx"), "utf8");
const layout = fs.readFileSync(path.join(root, "app/layout.tsx"), "utf8");

assert.ok(layout.includes("<PrivacySafeAnalytics />"), "analytics consent manager must be mounted globally");
assert.ok(analytics.includes('consent !== "accepted"'), "page views must require explicit consent");
assert.ok(analytics.includes("if (!measurementId) return null"), "analytics must remain disabled without configuration");
assert.ok(!analytics.includes("useSearchParams"), "analytics must not read or transmit URL query strings");
assert.ok(analytics.includes("allow_ad_personalization_signals:false"), "advertising personalization signals must be disabled");
assert.ok(analytics.includes("wardrobe photos, clothing details"), "consent copy must explain sensitive-data exclusions");

console.log("analytics privacy checks passed");
