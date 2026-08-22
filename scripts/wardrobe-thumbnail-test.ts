import assert from "node:assert/strict";
import sharp from "sharp";
import {
  createWardrobeThumbnailBuffer,
  WARDROBE_THUMBNAIL_HEIGHT,
  WARDROBE_THUMBNAIL_MIME_TYPE,
  WARDROBE_THUMBNAIL_WIDTH,
  wardrobeThumbnailStorageKey
} from "@/lib/image-processing/wardrobe-thumbnail";
import { readFileSync } from "node:fs";

async function main() {
  const backfillSource = readFileSync("scripts/backfill-wardrobe-thumbnails.ts", "utf8");
  assert.ok(backfillSource.includes('valueFor("record-ids")'), "Thumbnail repair must support explicit record IDs.");
  assert.ok(backfillSource.includes('valueFor("collection")'), "Thumbnail repair must support collection scoping.");
  const original = await sharp({
    create: {
      width: 3072,
      height: 4096,
      channels: 3,
      background: { r: 204, g: 67, b: 84 }
    }
  })
    .jpeg({ quality: 94 })
    .toBuffer();

  const thumbnail = await createWardrobeThumbnailBuffer(original);
  const metadata = await sharp(thumbnail.buffer).metadata();

  assert.equal(thumbnail.mimeType, WARDROBE_THUMBNAIL_MIME_TYPE);
  assert.equal(metadata.format, "webp");
  assert.ok((metadata.width || 0) <= WARDROBE_THUMBNAIL_WIDTH);
  assert.ok((metadata.height || 0) <= WARDROBE_THUMBNAIL_HEIGHT);
  assert.ok(thumbnail.bytes < original.byteLength);
  assert.equal(
    wardrobeThumbnailStorageKey("wardrobe/user/wardrobe_front-example.webp"),
    "wardrobe/user/wardrobe_front-example.thumbnail.webp"
  );
  assert.equal(
    wardrobeThumbnailStorageKey("/wardrobe/user/photo.JPG"),
    "wardrobe/user/photo.thumbnail.webp"
  );

  console.log(JSON.stringify({
    status: "passed",
    originalBytes: original.byteLength,
    thumbnailBytes: thumbnail.bytes,
    width: thumbnail.width,
    height: thumbnail.height
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
