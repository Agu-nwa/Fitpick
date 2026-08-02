import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { WardrobeItem } from "@/models/WardrobeItem";

for (const filename of [".env.local", ".env.production", ".env"]) { const target = path.resolve(process.cwd(), filename); if (fs.existsSync(target)) dotenv.config({ path: target, override: false, quiet: true }); }
const arg = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3) || "";
const limit = Math.max(1, Math.min(Number(arg("limit") || 10_000), 50_000));
const write = process.argv.includes("--write");
const fieldMap: Record<string, string[]> = { neckline: ["neckline", "necklineCollar"], accessoryScale: ["accessoryScale", "sizeScale", "statementLevel"], waistbandType: ["waistbandType", "waistType"], cuffType: ["cuffType"], garmentLength: ["garmentLength", "hemLength", "length"] };

function sourceValue(item: any, keys: string[]) { for (const key of keys) { const value = item.categorySpecificMetadata?.[key] ?? item.aiAnalysis?.categorySpecificMetadata?.[key] ?? item.normalisedMetadata?.specific?.[key]; if (value && value !== "unknown") return { value, key }; } return null; }

async function main() {
  const query: any = {};
  if (arg("category")) query.category = arg("category");
  if (arg("user-id")) { if (!mongoose.Types.ObjectId.isValid(arg("user-id"))) throw new Error("--user-id must be valid"); query.userId = arg("user-id"); }
  await connectDB();
  const records: any[] = await WardrobeItem.find(query).sort({ _id: 1 }).limit(limit).lean();
  const summary = { mode: write ? "write" : "dry-run", scanned: records.length, changed: 0, skippedUserConfirmed: 0, conflicts: 0, byField: {} as Record<string, number> };
  for (const item of records) {
    const patch: Record<string, unknown> = {}; const confidence: Record<string, number> = {}; const evidence: string[] = [];
    for (const [field, keys] of Object.entries(fieldMap)) {
      if (item.metadataSources?.[field] === "user") { summary.skippedUserConfirmed += 1; continue; }
      if (item[field] && item[field] !== "unknown") continue;
      const inferred = sourceValue(item, keys); if (!inferred) continue;
      patch[field] = inferred.value; confidence[field] = Number(item.aiAnalysis?.categorySpecificMetadataConfidence?.[inferred.key] || 0.65); evidence.push(`${field}:${inferred.key}`); summary.byField[field] = (summary.byField[field] || 0) + 1;
    }
    const changed = Object.keys(patch).length > 0; if (changed) summary.changed += 1;
    console.log(JSON.stringify({ recordId: String(item._id), existingSubtype: item.canonicalSubtype || "", proposedCanonicalSubtype: item.canonicalSubtype || "", proposedMetadata: patch, confidence, evidence, conflicts: item.taxonomyConflicts || [], needsReview: item.taxonomyStatus !== "confirmed", changed, status: write && changed ? "updated" : changed ? "would_update" : "unchanged" }));
    if (write && changed) await WardrobeItem.updateOne({ _id: item._id, taxonomyConfirmedBy: { $ne: "user" } }, { $set: { ...patch, ...Object.fromEntries(Object.keys(patch).map((field) => [`metadataSources.${field}`, "migration"])) } });
  }
  console.log(JSON.stringify({ summary }, null, 2));
}
main().catch((error) => { console.error("Styling metadata backfill failed:", error instanceof Error ? error.message : "Unknown error"); process.exitCode = 1; }).finally(async () => mongoose.disconnect());
