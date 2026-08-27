import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync(new URL("../app/api/users/me/data-export/route.ts", import.meta.url), "utf8");
const exporter = fs.readFileSync(new URL("../lib/privacy/data-export.ts", import.meta.url), "utf8");
const profile = fs.readFileSync(new URL("../components/profile/UnifiedProfileClient.tsx", import.meta.url), "utf8");

assert.match(route, /requireUser\(\)/, "data export is restricted to the signed-in user");
assert.match(route, /activeSessionIssuedAt/, "data export requires recent authentication");
assert.match(route, /rateLimitRequest/, "data export is rate limited");
assert.match(route, /private, no-store/, "data export cannot be cached");
assert.match(route, /account\.data_export/, "data export is audited");
assert.doesNotMatch(route, /searchParams.*userId|body.*userId/, "the client cannot select another export subject");
assert.match(exporter, /passwordHash/, "authentication secrets are explicitly excluded");
assert.match(exporter, /activeSessionId/, "session secrets are explicitly excluded");
assert.match(exporter, /supportmessages/, "support messages are included");
assert.match(exporter, /credittransactions/, "credit transactions are included");
assert.match(exporter, /wardrobeitems/, "wardrobe data is included");
assert.match(exporter, /getProtectedStorageUrl/, "media references use authenticated paths");
assert.match(profile, /Download my data/, "users can start export from Profile privacy controls");

console.log("Personal data export integrity tests passed.");
