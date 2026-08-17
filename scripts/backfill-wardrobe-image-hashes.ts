import crypto from "node:crypto";
import mongoose from "mongoose";
import { createPerceptualImageHash } from "../lib/image-processing/perceptual-hash";
import { downloadImageObject } from "../lib/storage";
import { WardrobeItem } from "../models/WardrobeItem";

const apply = process.argv.includes("--apply");
const limitArg = process.argv.find((value) => value.startsWith("--limit="));
const limit = Math.max(1, Math.min(Number(limitArg?.split("=")[1] || 100), 2_000));

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is required.");
  await mongoose.connect(mongoUri);
  const items = await WardrobeItem.find({
    archivedAt: null,
    storageKey: { $ne: "" },
    $or: [{ sourceImageHash: "" }, { sourceImageHash: { $exists: false } }, { perceptualImageHash: "" }, { perceptualImageHash: { $exists: false } }]
  }).select("_id storageKey sourceImageHash perceptualImageHash").limit(limit);

  let prepared = 0;
  let failed = 0;
  for (const item of items) {
    try {
      const downloaded = await downloadImageObject({ storageKey: item.storageKey });
      const sourceImageHash = item.sourceImageHash || crypto.createHash("sha256").update(downloaded.body).digest("hex");
      const perceptualImageHash = item.perceptualImageHash || await createPerceptualImageHash(downloaded.body);
      if (apply) await WardrobeItem.updateOne({ _id: item._id }, { $set: { sourceImageHash, perceptualImageHash } });
      prepared += 1;
    } catch {
      failed += 1;
    }
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", scanned: items.length, prepared, failed, limit }));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : "Backfill failed.");
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
