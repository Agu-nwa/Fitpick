import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { createWardrobeThumbnailFromStorage } from "@/lib/image-processing/wardrobe-thumbnail";
import { WardrobeItem } from "@/models/WardrobeItem";
import { WardrobeUpload } from "@/models/WardrobeUpload";

for (const filename of [".env.local", ".env.production", ".env"]) {
  const envPath = path.resolve(process.cwd(), filename);
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: false, quiet: true });
}

const valueFor = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3) || "";
const bounded = (value: string, fallback: number, maximum: number) => Math.max(1, Math.min(Number(value || fallback) || fallback, maximum));
const recordIds = valueFor("record-ids").split(",").map((value) => value.trim()).filter((value) => mongoose.isValidObjectId(value));
const requestedCollection = valueFor("collection");

function primaryAsset(record: any) {
  return record.images?.front || record.images?.back || (record.images?.additional || [])[0] || null;
}

function needsThumbnail(record: any) {
  const asset = primaryAsset(record);
  const thumbnail = asset?.variants?.thumbnail;
  return Boolean(
    (asset?.storageKey || record.storageKey) &&
    !(thumbnail?.status === "ready" && thumbnail?.url && thumbnail?.storageKey !== (asset?.storageKey || record.storageKey))
  );
}

function primaryPath(record: any) {
  if (record.images?.front) return "images.front";
  if (record.images?.back) return "images.back";
  if (record.images?.additional?.length) return "images.additional.0";
  return "images.front";
}

async function processModel(input: {
  label: "wardrobe_items" | "wardrobe_uploads";
  model: any;
  write: boolean;
  limit: number;
  batchSize: number;
}) {
  const summary = { collection: input.label, scanned: 0, eligible: 0, created: 0, failed: 0, skipped: 0 };
  let lastId: mongoose.Types.ObjectId | null = null;

  while (summary.scanned < input.limit) {
    const query: Record<string, unknown> = {
      $or: [
        { "images.front.storageKey": { $type: "string", $ne: "" } },
        { "images.back.storageKey": { $type: "string", $ne: "" } },
        { "images.additional.0.storageKey": { $type: "string", $ne: "" } },
        { storageKey: { $type: "string", $ne: "" } }
      ],
      ...(recordIds.length
        ? { _id: { $in: recordIds } }
        : lastId
          ? { _id: { $gt: lastId } }
          : {})
    };
    const records: any[] = await input.model.find(query).sort({ _id: 1 }).limit(Math.min(input.batchSize, input.limit - summary.scanned)).lean();
    if (!records.length) break;

    for (const record of records) {
      lastId = record._id;
      summary.scanned += 1;
      if (!needsThumbnail(record)) {
        summary.skipped += 1;
        continue;
      }

      const asset = primaryAsset(record);
      const storageKey = asset?.storageKey || record.storageKey || "";
      summary.eligible += 1;
      if (!input.write) {
        console.log(JSON.stringify({ collection: input.label, recordId: String(record._id), status: "would_create" }));
        continue;
      }

      try {
        const thumbnail = await createWardrobeThumbnailFromStorage(storageKey, { downloadTimeoutMs: 60_000 });
        const assetPath = primaryPath(record);
        const originalUrl = asset?.url || record.imageUrl || "";
        const originalProvider = asset?.provider || record.provider || "s3";
        const originalPurpose = asset?.purpose || "front";
        const patch: Record<string, unknown> = {
          thumbnailUrl: thumbnail.url,
          [`${assetPath}.url`]: originalUrl,
          [`${assetPath}.storageKey`]: storageKey,
          [`${assetPath}.provider`]: originalProvider,
          [`${assetPath}.purpose`]: originalPurpose,
          [`${assetPath}.variants.original.url`]: originalUrl,
          [`${assetPath}.variants.original.storageKey`]: storageKey,
          [`${assetPath}.variants.original.provider`]: originalProvider,
          [`${assetPath}.variants.original.status`]: "ready",
          [`${assetPath}.variants.thumbnail`]: thumbnail
        };
        await input.model.updateOne({ _id: record._id }, { $set: patch });
        summary.created += 1;
        console.log(JSON.stringify({ collection: input.label, recordId: String(record._id), status: "created", thumbnailBytes: thumbnail.bytes }));
      } catch (error) {
        summary.failed += 1;
        const reason = error instanceof Error
          ? error.message.replace(/https?:\/\/\S+/gi, "[url]").slice(0, 240)
          : "Unknown error";
        console.error(JSON.stringify({ collection: input.label, recordId: String(record._id), status: "failed", reason }));
      }
    }
    if (recordIds.length) break;
  }
  return summary;
}

async function main() {
  const write = process.argv.includes("--write");
  const limit = bounded(valueFor("limit"), 100, 10_000);
  const batchSize = bounded(valueFor("batch-size"), 20, 100);
  await connectDB();

  const wardrobeItems = requestedCollection && requestedCollection !== "wardrobe_items"
    ? { collection: "wardrobe_items", scanned: 0, eligible: 0, created: 0, failed: 0, skipped: 0 }
    : await processModel({ label: "wardrobe_items", model: WardrobeItem, write, limit, batchSize });
  const wardrobeUploads = requestedCollection && requestedCollection !== "wardrobe_uploads"
    ? { collection: "wardrobe_uploads", scanned: 0, eligible: 0, created: 0, failed: 0, skipped: 0 }
    : await processModel({ label: "wardrobe_uploads", model: WardrobeUpload, write, limit, batchSize });
  console.log(JSON.stringify({ mode: write ? "write" : "dry-run", wardrobeItems, wardrobeUploads }, null, 2));
}

main()
  .catch((error) => {
    console.error("Wardrobe thumbnail backfill failed:", error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
