import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { WARDROBE_TAXONOMY_VERSION, resolveCanonicalTaxonomy } from "@/lib/wardrobe/canonical-taxonomy";
import { WardrobeItem } from "@/models/WardrobeItem";

function loadEnv() {
  for (const filename of [".env.local", ".env.production", ".env"]) {
    const envPath = path.resolve(process.cwd(), filename);
    if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: false, quiet: true });
  }
}

function argument(name: string) {
  return process.argv.find((entry) => entry.startsWith(`--${name}=`))?.slice(name.length + 3) || "";
}

function safeLimit() {
  const parsed = Number(argument("limit") || 1000);
  return Math.max(1, Math.min(Number.isFinite(parsed) ? parsed : 1000, 50_000));
}

function shouldPreserve(item: any) {
  return item.taxonomyNeedsReview === false && Number(item.taxonomyConfidence || 0) >= 0.9 && Boolean(item.canonicalSubtype && item.structureRole && item.stylingRole && item.visibilityRole);
}

async function main() {
  loadEnv();
  const write = process.argv.includes("--write");
  const category = argument("category");
  const userId = argument("user-id");
  const limit = safeLimit();
  const batchSize = Math.max(1, Math.min(Number(argument("batch-size") || 100), 500));
  const query: Record<string, unknown> = {};
  if (category) query.category = category;
  if (userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) throw new Error("--user-id must be a valid identifier.");
    query.userId = userId;
  }

  await connectDB();
  const summary = {
    mode: write ? "write" : "dry-run",
    taxonomyVersion: WARDROBE_TAXONOMY_VERSION,
    scanned: 0,
    changed: 0,
    preserved: 0,
    needsReview: 0,
    byCategory: {} as Record<string, number>,
    bySubtype: {} as Record<string, number>
  };
  let lastId: mongoose.Types.ObjectId | null = null;

  while (summary.scanned < limit) {
    const remaining = Math.min(batchSize, limit - summary.scanned);
    const pageQuery: Record<string, unknown> = lastId ? { ...query, _id: { $gt: lastId } } : query;
    const records: any[] = await WardrobeItem.find(pageQuery).sort({ _id: 1 }).limit(remaining).lean();
    if (!records.length) break;

    for (const item of records) {
      lastId = item._id;
      summary.scanned += 1;
      summary.byCategory[item.category] = (summary.byCategory[item.category] || 0) + 1;

      if (shouldPreserve(item)) {
        summary.preserved += 1;
        console.log(JSON.stringify({ recordId: String(item._id), legacyCategory: item.category, legacySubtype: item.subcategory || "", status: "preserved_user_confirmed" }));
        continue;
      }

      const proposed = resolveCanonicalTaxonomy(item);
      const existingConfidence = Number(item.taxonomyConfidence || 0);
      if (existingConfidence > proposed.confidence && item.canonicalSubtype) {
        summary.preserved += 1;
        console.log(JSON.stringify({ recordId: String(item._id), legacyCategory: item.category, legacySubtype: item.subcategory || "", status: "preserved_higher_confidence", existingConfidence, proposedConfidence: proposed.confidence }));
        continue;
      }

      const patch = {
        canonicalSubtype: proposed.canonicalSubtype,
        structureRole: proposed.structureRole,
        stylingRole: proposed.stylingRole,
        setComponents: proposed.setComponents,
        visibilityRole: proposed.visibilityRole,
        formalityLevel: proposed.formalityLevel,
        taxonomyConfidence: proposed.confidence,
        taxonomyEvidence: proposed.evidence,
        taxonomyNeedsReview: proposed.needsReview,
        taxonomyVersion: proposed.taxonomyVersion
      };
      const changed = Object.entries(patch).some(([key, value]) => JSON.stringify(item[key] ?? (Array.isArray(value) ? [] : "")) !== JSON.stringify(value));
      if (proposed.needsReview) summary.needsReview += 1;
      if (proposed.canonicalSubtype) summary.bySubtype[proposed.canonicalSubtype] = (summary.bySubtype[proposed.canonicalSubtype] || 0) + 1;
      if (changed) summary.changed += 1;

      console.log(JSON.stringify({
        recordId: String(item._id),
        legacyCategory: item.category,
        legacySubtype: item.subcategory || "",
        proposedCanonicalSubtype: proposed.canonicalSubtype,
        proposedStructureRole: proposed.structureRole,
        proposedStylingRole: proposed.stylingRole,
        proposedVisibilityRole: proposed.visibilityRole,
        confidence: proposed.confidence,
        evidence: proposed.evidence,
        needsReview: proposed.needsReview,
        changed,
        status: write && changed ? "updated" : changed ? "would_update" : "unchanged"
      }));

      if (write && changed) {
        const confidenceGuard = item.taxonomyConfidence === undefined || item.taxonomyConfidence === null
          ? { $or: [{ taxonomyConfidence: { $exists: false } }, { taxonomyConfidence: { $lte: 0 } }] }
          : { taxonomyConfidence: item.taxonomyConfidence };
        await WardrobeItem.updateOne(
          { _id: item._id, ...confidenceGuard },
          { $set: patch }
        );
      }
    }
  }

  console.log(JSON.stringify({ summary }, null, 2));
}

main()
  .catch((error) => {
    console.error("Wardrobe taxonomy backfill failed:", error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
