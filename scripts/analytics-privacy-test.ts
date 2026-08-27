import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const analytics = fs.readFileSync(path.join(root, "components/analytics/PrivacySafeAnalytics.tsx"), "utf8");
const layout = fs.readFileSync(path.join(root, "app/layout.tsx"), "utf8");
const sentryClient = fs.readFileSync(path.join(root, "instrumentation-client.ts"), "utf8");
const sentryServer = fs.readFileSync(path.join(root, "sentry.server.config.ts"), "utf8");
const sentryEdge = fs.readFileSync(path.join(root, "sentry.edge.config.ts"), "utf8");
const sentryScrubber = fs.readFileSync(path.join(root, "lib/monitoring/sentry-privacy.ts"), "utf8");

assert.ok(layout.includes("<PrivacySafeAnalytics />"), "analytics consent manager must be mounted globally");
assert.ok(analytics.includes('consent !== "accepted"'), "page views must require explicit consent");
assert.ok(analytics.includes("if (!measurementId) return null"), "analytics must remain disabled without configuration");
assert.ok(!analytics.includes("useSearchParams"), "analytics must not read or transmit URL query strings");
assert.ok(analytics.includes("allow_ad_personalization_signals:false"), "advertising personalization signals must be disabled");
assert.ok(analytics.includes("wardrobe photos, clothing details"), "consent copy must explain sensitive-data exclusions");
assert.ok(analytics.includes("Cookie choices"), "users must be able to reopen cookie preferences");
assert.ok(analytics.includes("clearAnalyticsCookies"), "withdrawing analytics consent must clear analytics cookies");
assert.ok(!sentryClient.includes("replayIntegration"), "Sentry Session Replay must remain disabled");
assert.ok(!sentryClient.includes("replaysSessionSampleRate"), "Sentry replay sampling must remain disabled");
for (const source of [sentryClient, sentryServer, sentryEdge]) {
  assert.ok(source.includes("sendDefaultPii: false"), "Sentry must not send default personal information");
  assert.ok(source.includes("userInfo: false"), "Sentry user collection must be disabled");
  assert.ok(source.includes("httpBodies: []"), "Sentry request body collection must be disabled");
  assert.ok(source.includes("scrubSentryEvent"), "Sentry events must pass through the privacy scrubber");
}
assert.ok(sentryScrubber.includes("[private-media-url]"), "private media URLs must be scrubbed from monitoring events");
assert.equal(fs.existsSync(path.join(root, "app/sentry-example-page/page.tsx")), false, "production Sentry test page must be removed");
assert.equal(fs.existsSync(path.join(root, "app/api/sentry-example-api/route.ts")), false, "production Sentry test API must be removed");

console.log("analytics privacy checks passed");
