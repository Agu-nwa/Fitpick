import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { marketingPages } from "../lib/marketing/site";

const root = process.cwd();
const expectedPages = ["home", "how-it-works", "features", "ai-stylist", "digital-closet", "outfit-assembly"];

for (const page of expectedPages) {
  assert(marketingPages[page], `Missing marketing configuration for ${page}`);
  assert(marketingPages[page].sections.length >= 3, `${page} should have at least three editorial sections`);
}

const expectedAssets = [
  "public/marketing/myfitpick-cinematic-hero-blazer-v2.png",
  "public/marketing/myfitpick-digital-closet-diverse-v2.png",
  "public/marketing/myfitpick-ai-stylist-editorial-v1.png",
  "public/marketing/myfitpick-outfit-assembly-editorial-v1.png",
  "public/marketing/myfitpick-studio-model-brand-v2.png",
  "public/marketing/myfitpick-brand-models-transparent-v2.png",
  "assets/video/HIGGSFIELD-SEEDANCE-2-MINI.md"
];

for (const asset of expectedAssets) assert(existsSync(join(root, asset)), `Missing marketing asset: ${asset}`);

const searchableCopy = [
  readFileSync(join(root, "lib/marketing/site.ts"), "utf8"),
  readFileSync(join(root, "components/marketing/MarketingFeaturePage.tsx"), "utf8")
].join("\n").toLowerCase();

for (const unsupportedClaim of ["background removed automatically", "automatic background removal", "guaranteed fit", "seen in the world's"]) {
  assert(!searchableCopy.includes(unsupportedClaim), `Unsupported marketing claim found: ${unsupportedClaim}`);
}

const revealSource = readFileSync(join(root, "components/marketing/MarketingReveal.tsx"), "utf8");
assert(!revealSource.includes("opacity: 0"), "Marketing content must remain visible when client-side motion does not start");
assert(!revealSource.includes("whileInView"), "Marketing content must not depend on viewport observers to become visible");

console.log(`Marketing site verified: ${expectedPages.length} pages, ${expectedAssets.length} production assets.`);
