import assert from "node:assert/strict";
import fs from "node:fs";
import sharp from "sharp";
import { normalizeUploadedImageBuffer } from "../lib/image-normalization/server";
import { detectImageByteFormat, IMAGE_UPLOAD_POLICY, ImageUploadError, MAX_IMAGE_UPLOAD_BYTES } from "../lib/image-upload-policy";

async function makeImage(format: "jpeg" | "png" | "webp" | "tiff" | "avif") {
  let image = sharp({
    create: {
      width: 24,
      height: 16,
      channels: 4,
      background: { r: 90, g: 120, b: 110, alpha: 0.8 }
    }
  });
  if (format === "jpeg") return image.flatten({ background: "#ffffff" }).jpeg().toBuffer();
  if (format === "png") return image.png().toBuffer();
  if (format === "webp") return image.webp().toBuffer();
  if (format === "tiff") return image.tiff().toBuffer();
  return image.avif().toBuffer();
}

async function assertNormalizes(input: { format: "jpeg" | "png" | "webp" | "tiff" | "avif"; mimeType: string; filename: string }) {
  const buffer = await makeImage(input.format);
  const normalized = await normalizeUploadedImageBuffer({
    buffer,
    filename: input.filename,
    mimeType: input.mimeType,
    source: "desktop"
  });

  assert.ok(["image/webp", "image/jpeg"].includes(normalized.mimeType), `${input.format} should normalize to a standard storage MIME`);
  assert.ok(normalized.sizeBytes > 0 && normalized.sizeBytes <= MAX_IMAGE_UPLOAD_BYTES, `${input.format} should remain within upload budget`);
  assert.ok(normalized.width > 0 && normalized.height > 0, `${input.format} should keep dimensions`);
  assert.equal(normalized.original.detectedFormat, input.format, `${input.format} should be byte detected`);
}

async function main() {
  await assertNormalizes({ format: "jpeg", mimeType: "image/jpeg", filename: "shirt.jpg" });
  await assertNormalizes({ format: "png", mimeType: "image/png", filename: "shirt.png" });
  await assertNormalizes({ format: "webp", mimeType: "image/webp", filename: "shirt.webp" });
  await assertNormalizes({ format: "tiff", mimeType: "application/octet-stream", filename: "shirt.weird" });

  try {
    await assertNormalizes({ format: "avif", mimeType: "image/avif", filename: "shirt.avif" });
  } catch (error) {
    assert.match(String(error instanceof Error ? error.message : error), /avif|heif|unsupported|process/i, "AVIF normalization should either pass or fail safely depending on local libvips support");
  }

  const gif = Buffer.from("R0lGODlhAQABAIABAP///wAAACH5BAEKAAEALAAAAAABAAEAAAICRAEAOw==", "base64");
  const gifNormalized = await normalizeUploadedImageBuffer({ buffer: gif, filename: "animated.gif", mimeType: "image/gif", source: "gallery" });
  assert.equal(gifNormalized.original.detectedFormat, "gif", "GIF should be byte detected");
  assert.ok(gifNormalized.warnings.some((warning) => /first frame/i.test(warning)), "GIF should document first-frame normalization internally");

  const fakeMime = await normalizeUploadedImageBuffer({
    buffer: await makeImage("png"),
    filename: "not-a-photo.txt",
    mimeType: "text/plain",
    source: "gallery"
  });
  assert.equal(fakeMime.original.detectedFormat, "png", "actual bytes should override fake MIME and extension");

  await assert.rejects(
    () => normalizeUploadedImageBuffer({ buffer: Buffer.from("not an image"), filename: "photo.jpg", mimeType: "image/jpeg", source: "gallery" }),
    (error) => error instanceof ImageUploadError && error.message === "We couldn't process this image. Try another photo."
  );

  await assert.rejects(
    () => normalizeUploadedImageBuffer({ buffer: Buffer.alloc(MAX_IMAGE_UPLOAD_BYTES + 1), filename: "huge.jpg", mimeType: "image/jpeg", source: "gallery" }),
    (error) => error instanceof ImageUploadError && error.code === "IMAGE_TOO_LARGE"
  );

  const serverNormalizerSource = fs.readFileSync("lib/image-normalization/server.ts", "utf8");
  assert.ok(serverNormalizerSource.includes("limitInputPixels"), "server normalizer must enforce decompression bomb protection");
  assert.ok(serverNormalizerSource.includes(".rotate()"), "server normalizer must apply EXIF orientation correction");
  assert.ok(serverNormalizerSource.includes(".toColorspace(\"srgb\")"), "server normalizer must normalize color to sRGB");
  assert.ok(!serverNormalizerSource.includes("withMetadata"), "server normalizer must strip unnecessary metadata");
  assert.equal(detectImageByteFormat(gif).mimeType, "image/gif");
  assert.equal(IMAGE_UPLOAD_POLICY.maxInputPixels, 120_000_000);

  console.log("Image normalization regression checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
