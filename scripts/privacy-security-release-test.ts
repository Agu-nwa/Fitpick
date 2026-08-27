import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const requireText = (file: string, pattern: RegExp, message: string) => {
  if (!pattern.test(read(file))) throw new Error(message);
};

requireText("next.config.mjs", /poweredByHeader:\s*false/, "X-Powered-By must be disabled.");
for (const header of ["Content-Security-Policy", "Strict-Transport-Security", "Referrer-Policy", "Permissions-Policy", "X-Content-Type-Options", "X-Frame-Options"]) {
  requireText("next.config.mjs", new RegExp(header), `Missing security header: ${header}`);
}

requireText("schemas/auth.schema.ts", /purpose === "signup"[\s\S]*ageConfirmed !== true/, "Signup age confirmation must be validated server-side.");
requireText("app/api/auth/verify-otp/route.ts", /minimumAgePolicyVersion/, "Age policy evidence must be persisted.");
requireText("components/auth/AuthEntryForm.tsx", /at least 13 years old/, "Signup must show a neutral minimum-age confirmation.");

for (const route of ["app/api/payments/stripe/checkout/route.ts", "app/api/payments/usdt/checkout/route.ts"]) {
  requireText(route, /isIosAppStoreRequest\(request\)/, `${route} must reject iOS web checkout.`);
}
requireText("app/api/payments/providers/route.ts", /providers:\s*\{ appStore:/, "iOS provider discovery must expose Apple only.");

requireText("lib/account-deletion/account-deletion.ts", /supportmessages[\s\S]*deleteMany/, "Account deletion must remove support messages.");
requireText("lib/account-deletion/account-deletion.ts", /supportinternalnotes[\s\S]*deleteMany/, "Account deletion must remove support notes.");
requireText("lib/account-deletion/account-deletion.ts", /collectStorageKeys\(message\.attachments/, "Support attachment objects must be collected for deletion.");
requireText("lib/account-deletion/account-deletion.ts", /"privacyrequests"/, "Privacy requests must be included in account deletion.");
requireText("lib/privacy/retention.ts", /PrivacyRequest\.deleteMany/, "Expired privacy requests must be cleaned automatically.");
requireText("workers/fitpick-worker.ts", /runRetentionCleanup/, "The worker must run automated retention cleanup.");
requireText("models/PrivacyPreference.ts", /provider:[\s\S]*purpose:[\s\S]*policyVersion:[\s\S]*recordedAt:/, "AI consent evidence must record provider, purpose, version and time.");

if (!fs.existsSync(path.join(root, "ios/App/App/PrivacyInfo.xcprivacy"))) throw new Error("Apple privacy manifest is missing.");
requireText("ios/App/App/PrivacyInfo.xcprivacy", /NSPrivacyTracking[\s\S]*<false\/>/, "Privacy manifest must state that tracking is disabled.");

console.log("Privacy, security, age, and Apple release checks passed.");
