import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const requiredFiles = [
  "package.json",
  ".env.example",
  "docs/deployment-phase-8.md",
  "docs/production-env-checklist.md",
  "docs/security/security-hardening.md",
  "docs/security/privacy-readiness.md",
  "docs/deployment/secrets-rotation.md",
  "docs/testing-phase-7.md",
  "app/home/page.tsx",
  "app/onboarding/page.tsx",
  "app/wardrobe/page.tsx",
  "app/wardrobe/add/page.tsx",
  "app/wardrobe/[id]/page.tsx",
  "app/outfit/page.tsx",
  "app/outfit/[id]/page.tsx",
  "app/looks/page.tsx",
  "app/profile/page.tsx",
  "app/plus/page.tsx",
  "app/backend-ready/page.tsx",
  "app/frontend-complete/page.tsx"
];

const requiredEnvNames = [
  "NODE_ENV",
  "APP_URL",
  "NEXT_PUBLIC_APP_URL",
  "SESSION_COOKIE_NAME",
  "JWT_SECRET",
  "MONGODB_URI",
  "STORAGE_PROVIDER",
  "S3_BUCKET",
  "S3_REGION",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_PUBLIC_BASE_URL",
  "AI_TAGGING_PROVIDER",
  "GEMINI_API_KEY",
  "OPENAI_API_KEY",
  "PAYMENT_PROVIDER",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "FITPICK_PLUS_STRIPE_PRICE_ID",
  "STRIPE_SUCCESS_URL",
  "STRIPE_CANCEL_URL",
  "PAYSTACK_SECRET_KEY",
  "PAYSTACK_PUBLIC_KEY",
  "PAYSTACK_WEBHOOK_SECRET",
  "FITPICK_PLUS_PAYSTACK_PLAN_CODE",
  "PAYSTACK_CALLBACK_URL",
  "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY",
  "RATE_LIMIT_REDIS_URL"
];

const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Missing required file: ${file}`);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
if (!packageJson.scripts?.build) failures.push("Missing package script: build");
if (!packageJson.scripts?.start) failures.push("Missing package script: start");
if (!packageJson.scripts?.["check:routes"]) failures.push("Missing package script: check:routes");

const envDocs = [
  existsSync(".env.example") ? readFileSync(".env.example", "utf8") : "",
  existsSync("docs/production-env-checklist.md") ? readFileSync("docs/production-env-checklist.md", "utf8") : "",
  existsSync("docs/deployment-phase-8.md") ? readFileSync("docs/deployment-phase-8.md", "utf8") : ""
].join("\n");

for (const envName of requiredEnvNames) {
  if (!envDocs.includes(envName)) failures.push(`Production environment variable is not documented: ${envName}`);
}

let trackedFiles = "";
try {
  trackedFiles = execFileSync("git", ["ls-files"], { encoding: "utf8" });
} catch {
  failures.push("Unable to inspect tracked files with git.");
}

const trackedList = trackedFiles.split("\n").filter(Boolean);
for (const forbidden of [".env.local", "node_modules", ".next"]) {
  const tracked = trackedList.some((file) => file === forbidden || file.startsWith(`${forbidden}/`));
  if (tracked) failures.push(`Deployment-only artifact is tracked: ${forbidden}`);
}

if (failures.length) {
  console.error("Deploy check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Deploy check passed.");
console.log("Build command is available: npm run build");
console.log("Start command is available: npm run start");
console.log("PM2 production command is documented in docs/deployment-phase-8.md.");
