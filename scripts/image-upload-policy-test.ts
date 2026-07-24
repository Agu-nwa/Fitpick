import assert from "node:assert/strict";
import {
  IMAGE_UPLOAD_POLICY,
  ImageUploadError,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_IMAGE_UPLOAD_MB,
  detectImageByteFormat,
  detectImageFileType,
  imageUploadRequirementText,
  messageForImageUploadError,
  normalizedImageFilename,
  validateImageByteCandidate,
  validateImageFileCandidate
} from "../lib/image-upload-policy";
import { signedUploadSchema } from "../schemas/upload.schema";
import { uploadMetadataSchema } from "../schemas/wardrobe.schema";

const heic = detectImageFileType({ name: "IMG_1001.HEIC", type: "", size: 4_000_000 });
assert.equal(heic.detectedMimeType, "image/heic", "HEIC should be detected by extension when MIME is missing");
assert.equal(heic.isHeicLike, true, "HEIC should be marked for conversion");

const heif = detectImageFileType({ name: "portrait.heif", type: "application/octet-stream", size: 3_000_000 });
assert.equal(heif.isSupportedMimeType, false, "unsafe octet-stream MIME should not be trusted over extension by itself");

const jpegMissingMime = validateImageFileCandidate({ name: "closet-photo.jpeg", type: "", size: 2_000_000 }, "gallery");
assert.equal(jpegMissingMime.ok, true, "JPEG with missing MIME should be accepted by extension");

const png = validateImageFileCandidate({ name: "fit.png", type: "image/png", size: 500_000 }, "desktop");
assert.equal(png.ok, true, "valid PNG should be accepted");

const webp = validateImageFileCandidate({ name: "fit.webp", type: "image/webp", size: 500_000 }, "desktop");
assert.equal(webp.ok, true, "valid WebP should be accepted");

const avif = validateImageFileCandidate({ name: "fit.avif", type: "image/avif", size: 500_000 }, "desktop");
assert.equal(avif.ok, true, "valid AVIF should be accepted");

const tiff = validateImageFileCandidate({ name: "scan.tiff", type: "image/tiff", size: 500_000 }, "gallery");
assert.equal(tiff.ok, true, "valid TIFF should be accepted for server normalization");

const gif = validateImageFileCandidate({ name: "animated.gif", type: "image/gif", size: 500_000 }, "gallery");
assert.equal(gif.ok, true, "valid GIF should be accepted and normalized from the first frame");

const mismatch = detectImageFileType({ name: "photo.png", type: "image/jpeg", size: 500_000 });
assert.equal(mismatch.hasMimeExtensionMismatch, true, "MIME/extension mismatch should be visible in diagnostics");

const jpegBytes = detectImageByteFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]));
assert.equal(jpegBytes.mimeType, "image/jpeg", "JPEG should be detected from bytes");

const pngBytes = validateImageByteCandidate({ name: "fake.jpg", type: "image/jpeg", size: 500_000 }, new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "gallery");
assert.equal(pngBytes.ok, true, "actual bytes should override fake extension and browser MIME");
if (pngBytes.ok) assert.equal(pngBytes.detected.detectedMimeType, "image/png");

const heicBytes = validateImageByteCandidate({ name: "photo.bin", type: "application/octet-stream", size: 500_000 }, new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 104, 101, 105, 99]), "gallery");
assert.equal(heicBytes.ok, true, "HEIC should be accepted by real ftyp bytes even when MIME is weak");

const avifBytes = detectImageByteFormat(new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 97, 118, 105, 102]));
assert.equal(avifBytes.mimeType, "image/avif", "AVIF should be detected from ftyp bytes");

const tiffBytes = detectImageByteFormat(new Uint8Array([0x49, 0x49, 0x2a, 0x00, 0, 0, 0, 0]));
assert.equal(tiffBytes.mimeType, "image/tiff", "TIFF should be detected from bytes");

const gifBytes = detectImageByteFormat(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]));
assert.equal(gifBytes.mimeType, "image/gif", "GIF should be detected from bytes");

const livePhotoStill = validateImageFileCandidate({ name: "IMG_2222.JPG", type: "image/jpeg", size: 3_000_000, lastModified: Date.now() }, "gallery");
assert.equal(livePhotoStill.ok, true, "Live Photo still JPEG should be accepted as a normal image");

const largeIphonePhoto = validateImageFileCandidate({ name: "large-iphone-photo.jpg", type: "image/jpeg", size: 49 * 1024 * 1024 }, "gallery");
assert.equal(largeIphonePhoto.ok, true, "valid fashion images under 50 MB should be accepted");

const signedUploadAtLimit = signedUploadSchema.safeParse({
  filename: "large-iphone-photo.jpg",
  mimeType: "image/jpeg",
  sizeBytes: MAX_IMAGE_UPLOAD_BYTES,
  purpose: "wardrobe_front"
});
assert.equal(signedUploadAtLimit.success, true, "signed upload API validation should accept 50 MB images");

const wardrobeMetadataAtLimit = uploadMetadataSchema.safeParse({
  filename: "large-iphone-photo.jpg",
  mimeType: "image/jpeg",
  sizeBytes: MAX_IMAGE_UPLOAD_BYTES
});
assert.equal(wardrobeMetadataAtLimit.success, true, "wardrobe upload metadata validation should accept 50 MB images");

const emptyIcloud = validateImageFileCandidate({ name: "icloud.jpg", type: "image/jpeg", size: 0 }, "gallery");
assert.equal(emptyIcloud.ok, false, "empty cloud-backed files should fail closed");
if (!emptyIcloud.ok) assert.equal(emptyIcloud.error.code, "ICLOUD_FILE_UNAVAILABLE");

const tooLarge = validateImageFileCandidate({ name: "huge-iphone-photo.jpg", type: "image/jpeg", size: IMAGE_UPLOAD_POLICY.maxInputBytes + 1 }, "gallery");
assert.equal(tooLarge.ok, false, "oversized input should fail before upload");
if (!tooLarge.ok) assert.equal(tooLarge.error.code, "IMAGE_TOO_LARGE");

const signedUploadOverLimit = signedUploadSchema.safeParse({
  filename: "too-large-photo.jpg",
  mimeType: "image/jpeg",
  sizeBytes: MAX_IMAGE_UPLOAD_BYTES + 1,
  purpose: "wardrobe_front"
});
assert.equal(signedUploadOverLimit.success, false, "signed upload API validation should reject images over 50 MB");

const unknown = validateImageFileCandidate({ name: "photo", type: "", size: 500_000 }, "gallery");
assert.equal(unknown.ok, false, "unknown MIME and extension should be rejected");
if (!unknown.ok) assert.equal(unknown.error.code, "IMAGE_MIME_UNKNOWN");

const signedRawTiff = signedUploadSchema.safeParse({
  filename: "scan.tiff",
  mimeType: "image/tiff",
  sizeBytes: 500_000,
  purpose: "wardrobe_front"
});
assert.equal(signedRawTiff.success, false, "direct signed upload should only accept normalized storage images");

assert.equal(normalizedImageFilename("IMG 1234.HEIC"), "IMG-1234.webp", "normalized upload filename should become WebP");
assert.equal(MAX_IMAGE_UPLOAD_MB, 50, "shared upload size label should be 50 MB");
assert.equal(MAX_IMAGE_UPLOAD_BYTES, 50 * 1024 * 1024, "shared upload byte limit should be 50 MB");
assert.equal(IMAGE_UPLOAD_POLICY.fileInputResetRequired, true, "same-file reselection requires input reset");
assert.equal(IMAGE_UPLOAD_POLICY.acceptedOutputMimeType, "image/webp", "WebP should be the preferred internal upload format");
assert.ok(IMAGE_UPLOAD_POLICY.normalizedStorageMimeTypes.includes("image/jpeg"), "JPEG fallback should remain supported for normalized storage");
assert.match(imageUploadRequirementText(), /50 MB/);
assert.match(messageForImageUploadError("IMAGE_TOO_LARGE"), /50 MB/);
assert.equal(messageForImageUploadError("IMAGE_DECODE_FAILED").length > 0, true, "decode failure must map to user copy");
assert.equal(new ImageUploadError("IMAGE_PREVIEW_FAILED", messageForImageUploadError("IMAGE_PREVIEW_FAILED")).code, "IMAGE_PREVIEW_FAILED");

console.log("Image upload policy regression checks passed.");
