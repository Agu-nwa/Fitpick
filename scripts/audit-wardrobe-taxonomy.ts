import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { WardrobeItem } from "@/models/WardrobeItem";
import { detectTaxonomyConflicts } from "@/lib/wardrobe/taxonomy-review";

for (const filename of [".env.local", ".env.production", ".env"]) { const target = path.resolve(process.cwd(), filename); if (fs.existsSync(target)) dotenv.config({ path: target, override: false, quiet: true }); }
const arg = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3) || "";
const limit = Math.max(1, Math.min(Number(arg("limit") || 10_000), 100_000));
function increment(target: Record<string, number>, key: unknown) { const safe = String(key || "unknown").slice(0, 60); target[safe] = (target[safe] || 0) + 1; }

async function main() {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--confirm-production-readonly")) throw new Error("Production read-only audit requires --confirm-production-readonly.");
  const query: any = {};
  if (arg("category")) query.category = arg("category");
  if (arg("days")) query.createdAt = { $gte: new Date(Date.now() - Math.max(1, Number(arg("days"))) * 86_400_000) };
  await connectDB();
  const databaseName = mongoose.connection.db?.databaseName || "unknown";
  const records: any[] = await WardrobeItem.find(query).sort({ _id: 1 }).limit(limit).lean();
  const report: any = { databaseName, mode: "read_only_aggregate", limitedTo: limit, totalWardrobeRecords: records.length, withCanonicalSubtype: 0, needsReview: 0, unresolvedGenericJewelry: 0, unresolvedGenericAccessories: 0, conflictingRoles: 0, missingNeckline: 0, missingWaistbandData: 0, missingCuffType: 0, missingShoeCompatibilityMetadata: 0, accessoryRoleDistribution: {}, footwearSubtypeDistribution: {}, recommendationOmissionReasonDistribution: {} };
  for (const item of records) {
    if (item.canonicalSubtype) report.withCanonicalSubtype += 1;
    if (item.taxonomyStatus !== "confirmed" || item.taxonomyNeedsReview !== false) report.needsReview += 1;
    if (item.category === "accessories" && /jewel/i.test(`${item.canonicalSubtype || ""} ${item.subcategory || ""}`) && item.taxonomyStatus !== "confirmed") report.unresolvedGenericJewelry += 1;
    if (item.category === "accessories" && !item.canonicalSubtype) report.unresolvedGenericAccessories += 1;
    if (detectTaxonomyConflicts(item).status === "conflicting") report.conflictingRoles += 1;
    if (["tops", "dresses", "native"].includes(item.category) && (!item.neckline || item.neckline === "unknown")) report.missingNeckline += 1;
    if (item.category === "bottoms" && (!item.waistbandType || item.waistbandType === "unknown")) report.missingWaistbandData += 1;
    if (item.category === "tops" && /shirt/i.test(`${item.canonicalSubtype || ""} ${item.subcategory || ""}`) && (!item.cuffType || item.cuffType === "unknown")) report.missingCuffType += 1;
    if (item.category === "shoes" && (!item.footwearAttributes || (!item.footwearAttributes.toeStyle && !item.footwearAttributes.comfortLevel))) report.missingShoeCompatibilityMetadata += 1;
    if (item.category === "accessories") increment(report.accessoryRoleDistribution, item.stylingRole);
    if (item.category === "shoes") increment(report.footwearSubtypeDistribution, item.canonicalSubtype);
    if (item.recommendationMetadata?.omissionReason) increment(report.recommendationOmissionReasonDistribution, item.recommendationMetadata.omissionReason);
  }
  console.log(JSON.stringify(report, null, 2));
}
main().catch((error) => { console.error("Wardrobe taxonomy audit failed:", error instanceof Error ? error.message : "Unknown error"); process.exitCode = 1; }).finally(async () => mongoose.disconnect());
