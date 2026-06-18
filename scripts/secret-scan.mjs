import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["app", "components", "lib", "schemas", "types", "docs", "scripts"];
const ignoredDirs = new Set(["node_modules", ".next", ".git"]);
const riskyPatterns = [
  /sk_live_[A-Za-z0-9]+/,
  /sk_test_[A-Za-z0-9]+/,
  /pk_live_[A-Za-z0-9]{20,}/,
  /PAYSTACK_SECRET_KEY\s*=\s*['"][^'"]+['"]/,
  /CLOUDINARY_API_SECRET\s*=\s*['"][^'"]+['"]/,
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
