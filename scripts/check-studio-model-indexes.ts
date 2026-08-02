import { connectDB } from "../lib/db";
import { StudioModelAsset } from "../models/StudioModelAsset";
async function main() {
  await connectDB();
  const indexes = await StudioModelAsset.collection.indexes();
  const duplicates = await StudioModelAsset.aggregate([{ $group: { _id: { appearanceKey: "$appearanceKey", version: "$version" }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $count: "count" }]);
  const statuses = await StudioModelAsset.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  console.log(JSON.stringify({ indexes: indexes.map(({ name, key, unique }) => ({ name, fields: key, unique: Boolean(unique), ready: true })), duplicateAppearanceKeys: duplicates[0]?.count || 0, statuses }, null, 2));
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Index inspection failed."); process.exitCode = 1; });
