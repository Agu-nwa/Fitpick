import "dotenv/config";
import { connectDB } from "@/lib/db";
import { resolveAccessorySubtype } from "@/lib/wardrobe/accessory-subtypes";
import { WardrobeItem } from "@/models/WardrobeItem";

async function main() {
  const write = process.argv.includes("--write");
  await connectDB();
  const items = await WardrobeItem.find({ category: "accessories", archivedAt: null })
    .select("name category subcategory accessorySubtype userInputMetadata categorySpecificMetadata recommendationMetadata verifiedMetadata aiAnalysis")
    .lean();
  const report = { mode: write ? "write" : "dry-run", inspected: items.length, existingCanonical: 0, highConfidence: 0, ambiguous: 0, unresolved: 0, updated: 0 };

  for (const item of items) {
    const resolution = resolveAccessorySubtype(item as unknown as Record<string, unknown>);
    if (resolution.confidence === "authoritative") report.existingCanonical += 1;
    else if (resolution.confidence === "high" && resolution.subtype) report.highConfidence += 1;
    else if (resolution.confidence === "ambiguous") report.ambiguous += 1;
    else report.unresolved += 1;

    if (write && !item.accessorySubtype && resolution.confidence === "high" && resolution.subtype) {
      const result = await WardrobeItem.updateOne(
        { _id: item._id, accessorySubtype: null },
        { $set: {
          accessorySubtype: resolution.subtype,
          "recommendationMetadata.accessorySubtypeInference": { source: resolution.source, confidence: resolution.confidence, version: "accessory-subtype-v1" }
        } }
      );
      report.updated += result.modifiedCount;
    }
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(0);
}

main().catch(() => {
  process.stderr.write("Accessory subtype backfill failed safely. Check database configuration and retry.\n");
  process.exit(1);
});
