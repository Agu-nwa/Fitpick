import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const removedFiles = [
  "app/looks/page.tsx",
  "app/api/looks/route.ts",
  "app/api/looks/[id]/route.ts",
  "components/looks/LooksClient.tsx",
  "models/SavedLook.ts"
];

const forbiddenPatterns: Array<{ label: string; pattern: RegExp }> = [
  { label: "old /looks route", pattern: /["'`]\/looks\b/ },
  { label: "old Looks model", pattern: /\bSavedLook\b/ },
  { label: "old Looks client", pattern: /\bLooksClient\b/ },
  { label: "old Looks API helpers", pattern: /\b(getLooks|createManualLook|updateLook|deleteLook)\b/ },
  { label: "old manual look schemas", pattern: /\b(looksQuerySchema|manualLookSchema|updateManualLookSchema)\b/ },
  { label: "old Looks audit actions", pattern: /\blooks\.(create|update|delete)\b/ }
];

const ignoredDirectories = new Set([".git", ".next", "node_modules"]);
const ignoredFiles = new Set(["scripts/looks-removal-test.ts"]);
const checkedExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json"]);

const failures: string[] = [];

for (const file of removedFiles) {
  if (existsSync(file)) failures.push(`Removed Looks file still exists: ${file}`);
}

function shouldCheck(file: string) {
  if (ignoredFiles.has(file)) return false;
  return Array.from(checkedExtensions).some((extension) => file.endsWith(extension));
}

function walk(directory: string) {
  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) continue;

    const absolutePath = join(directory, entry);
    const relativePath = relative(process.cwd(), absolutePath);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      walk(absolutePath);
      continue;
    }

    if (!stats.isFile() || !shouldCheck(relativePath)) continue;

    const source = readFileSync(absolutePath, "utf8");
    for (const { label, pattern } of forbiddenPatterns) {
      if (pattern.test(source)) failures.push(`${label} reference found in ${relativePath}`);
    }
  }
}

walk(process.cwd());

if (failures.length) {
  console.error("Looks removal regression check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Looks removal regression check passed.");
