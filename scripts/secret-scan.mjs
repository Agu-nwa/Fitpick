import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["app", "components", "lib", "schemas", "types", "docs", "scripts", "workers"];
const rootFiles = [
  "ecosystem.config.js",
  "next.config.mjs",
  "package.json",
  "tsconfig.json",
  ".env.example"
];
const ignoredDirs = new Set(["node_modules", ".next", ".git"]);
const riskyPatterns = [
  /AKIA[0-9A-Z]{16}/,
  /ASIA[0-9A-Z]{16}/,
  /AIza[0-9A-Za-z_-]{20,}/,
  /sk-[A-Za-z0-9_-]{20,}/,
  /sk_live_[A-Za-z0-9]+/,
  /sk_test_[A-Za-z0-9]+/,
  /pk_live_[A-Za-z0-9]{20,}/,
  /mongodb(?:\+srv)?:\/\/[^<\s"']+:[^<\s"']+@/i,
  /S3_SECRET_ACCESS_KEY\s*[:=]\s*['"][^'"]+['"]/,
  /S3_ACCESS_KEY_ID\s*[:=]\s*['"][^'"]+['"]/,
  /OPENAI_API_KEY\s*[:=]\s*['"][^'"]+['"]/,
  /COINPAYMENTS_(CLIENT_SECRET|WEBHOOK_SECRET)\s*[:=]\s*['"][^'"]+['"]/,
  /CLOUDINARY_API_SECRET\s*=\s*['"][^'"]+['"]/,
  /CLOUDINARY_(CLOUD_NAME|API_KEY|API_SECRET)\s*:\s*['"][^'"]+['"]/,
  /JWT_SECRET\s*=\s*['"][^'"]+['"]/,
  /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/
];
const hits = [];

function isIgnoredFile(path) {
  return path.endsWith(".env.example") || path.endsWith("docs/integration-status.md") || path.endsWith("docs/backend-api-contract.md");
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (ignoredDirs.has(name)) continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else if (!isIgnoredFile(path) && stat.size < 1024 * 1024) scan(path);
  }
}

function scan(path) {
  const text = readFileSync(path, "utf8");
  for (const pattern of riskyPatterns) {
    if (pattern.test(text)) hits.push({ path, pattern: String(pattern) });
  }
}

for (const root of roots) if (existsSync(root)) walk(root);
for (const file of rootFiles) if (existsSync(file)) scan(file);

try {
  const tracked = execSync("git ls-files .env.local", { encoding: "utf8" }).trim();
  if (tracked) hits.push({ path: ".env.local", pattern: "env-local-tracked" });
} catch {
  // Git may be unavailable in some packaging environments.
}

if (hits.length) {
  console.error("Potential secret exposure found:");
  for (const hit of hits) console.error(`- ${hit.path}: ${hit.pattern}`);
  process.exit(1);
}

console.log("Secret scan passed.");
