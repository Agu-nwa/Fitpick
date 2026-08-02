import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { inferAccessoryTaxonomy } from "@/lib/wardrobe/accessory-taxonomy";
import { WARDROBE_TAXONOMY_VERSION } from "@/lib/wardrobe/canonical-taxonomy";
import { WardrobeItem } from "@/models/WardrobeItem";

for (const filename of [".env.local", ".env.production", ".env"]) {
  const envPath = path.resolve(process.cwd(), filename);
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: false, quiet: true });
}
const arg = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3) || "";
const bounded = (value: string, fallback: number, maximum: number) => Math.max(1, Math.min(Number(value || fallback) || fallback, maximum));

async function main() {
  const write = process.argv.includes("--write");
  const limit = bounded(arg("limit"), 10_000, 50_000);
  const batchSize = bounded(arg("batch-size"), 100, 500);
  await connectDB();
  const summary = { mode: write ? "write" : "dry-run", scanned: 0, changed: 0, preserved: 0, unresolved: 0, bySubtype: {} as Record<string, number> };
  let lastId: mongoose.Types.ObjectId | null = null;
  while (summary.scanned < limit) {
    const query: any = { category: "accessories", ...(lastId ? { _id: { $gt: lastId } } : {}) };
    const records: any[] = await WardrobeItem.find(query).sort({ _id: 1 }).limit(Math.min(batchSize, limit - summary.scanned)).lean();
    if (!records.length) break;
    for (const item of records) {
      lastId = item._id;
      summary.scanned += 1;
      const inference = inferAccessoryTaxonomy(item);
      summary.bySubtype[inference.subtype] = (summary.bySubtype[inference.subtype] || 0) + 1;
      if (inference.needsReview) summary.unresolved += 1;
      const existingConfidence = Number(item.taxonomyConfidence || 0);
      const confirmed = item.taxonomyNeedsReview === false && existingConfidence >= 0.9 && item.canonicalSubtype && item.stylingRole;
      if (confirmed || (item.canonicalSubtype && existingConfidence > inference.confidence)) {
        summary.preserved += 1;
        console.log(JSON.stringify({ recordId: String(item._id), previousSubtype: item.canonicalSubtype || item.subcategory || "", proposedSubtype: inference.subtype, confidence: inference.confidence, evidence: inference.evidence, changed: false, status: confirmed ? "preserved_confirmed" : "preserved_higher_confidence" }));
        continue;
      }
      const patch = { canonicalSubtype: inference.subtype, structureRole: "finisher", stylingRole: inference.role, visibilityRole: inference.needsReview ? "unknown" : "visible_finisher", taxonomyConfidence: inference.confidence, taxonomyEvidence: inference.evidence, taxonomyNeedsReview: inference.needsReview, taxonomyVersion: WARDROBE_TAXONOMY_VERSION };
      const changed = Object.entries(patch).some(([key, value]) => JSON.stringify(item[key] ?? "") !== JSON.stringify(value));
      if (changed) summary.changed += 1;
      console.log(JSON.stringify({ recordId: String(item._id), previousSubtype: item.canonicalSubtype || item.subcategory || "", proposedSubtype: inference.subtype, proposedRole: inference.role, confidence: inference.confidence, evidence: inference.evidence, changed, status: write && changed ? "updated" : changed ? "would_update" : "unchanged" }));
      if (write && changed) await WardrobeItem.updateOne({ _id: item._id, $or: [{ taxonomyConfidence: { $exists: false } }, { taxonomyConfidence: { $lte: inference.confidence } }] }, { $set: patch });
    }
  }
  console.log(JSON.stringify({ summary }, null, 2));
}

main().catch((error) => { console.error("Accessory taxonomy backfill failed:", error instanceof Error ? error.message : "Unknown error"); process.exitCode = 1; }).finally(async () => mongoose.disconnect());
