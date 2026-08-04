import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { summarizeTaxonomyAudit } from "../lib/wardrobe/taxonomy-audit";

const args = process.argv.slice(2);
const value = (name: string) => args.find((entry) => entry.startsWith(`--${name}=`))?.split("=").slice(1).join("=") || "";
const limit = Math.max(1, Math.min(Number(value("limit") || 500), 5000));
const userId = value("user-id");
const dryRun = args.includes("--dry-run");

const fixtureItems = [
  { id: "valid-shirt", category: "tops", canonicalSubtype: "shirt", taxonomyVersion: "wardrobe-taxonomy-v2", taxonomyConfidence: 1 },
  { id: "bad-subtype", category: "tops", canonicalSubtype: "loafers", taxonomyConfidence: 0.4 },
  { id: "unknown-jewellery", category: "accessories", subcategory: "Jewelry" },
  { id: "contradictory-weather", category: "outerwear", canonicalSubtype: "coat", taxonomyVersion: "wardrobe-taxonomy-v2", weather: ["hot summer", "snow freezing"] }
];

async function main() {
  let items: any[] = fixtureItems;
  let source = "synthetic-fixtures";
  if (userId) {
    if (!dryRun) throw new Error("This audit is read-only; include --dry-run.");
    for (const filename of [".env.local", ".env.production", ".env"]) { const target = path.resolve(process.cwd(), filename); if (fs.existsSync(target)) dotenv.config({ path: target, override: false, quiet: true }); }
    const { connectDB } = await import("../lib/db");
    const { WardrobeItem } = await import("../models/WardrobeItem");
    await connectDB();
    items = await WardrobeItem.find({ userId, archivedAt: { $exists: false } }).sort({ _id: 1 }).limit(limit).lean();
    source = "user-scoped-read-only";
  }
  const report = { source, limit, ...summarizeTaxonomyAudit(items) };
  console.log(JSON.stringify(args.includes("--summary") ? { ...report, problems: undefined } : report, null, 2));
}

main().catch((error) => { console.error("Wardrobe taxonomy audit failed:", error instanceof Error ? error.message : "Unknown error"); process.exitCode = 1; }).finally(async () => mongoose.disconnect());
