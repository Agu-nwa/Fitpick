import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["app", "components", "lib", "docs"];
const ignoredDirs = new Set(["node_modules", ".next", ".git"]);
const banned = [
  "hides flaws",
  "fixes your body",
  "slimming",
  "makes you look thinner",
  "body goals",
  "perfect body",
  "unattractive",
  "body type criticism"
];
const wordBanned = ["fat", "skinny", "ugly"];
const hits = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (ignoredDirs.has(name)) continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else if (/\.(tsx?|md|mjs|json)$/.test(name)) scan(path);
  }
}

function scan(path) {
  const text = readFileSync(path, "utf8").toLowerCase();
  for (const phrase of banned) {
    if (text.includes(phrase)) hits.push({ path, phrase });
  }
  for (const word of wordBanned) {
    if (new RegExp(`\\b${word}\\b`, "i").test(text)) hits.push({ path, phrase: word });
  }
}

for (const root of roots) walk(root);

if (hits.length) {
  console.error("Unsafe body-critical copy found:");
  for (const hit of hits) console.error(`- ${hit.path}: ${hit.phrase}`);
  process.exit(1);
}

console.log("Safety copy scan passed.");
