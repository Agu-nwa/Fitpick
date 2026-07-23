import assert from "node:assert/strict";
import {
  IMAGE_UPLOAD_POLICY,
  ImageUploadError,
  detectImageFileType,
  imageUploadRequirementText,
  messageForImageUploadError,
  normalizedImageFilename,
  validateImageFileCandidate
} from "../lib/image-upload-policy";

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

const mismatch = detectImageFileType({ name: "photo.png", type: "image/jpeg", size: 500_000 });
assert.equal(mismatch.hasMimeExtensionMismatch, true, "MIME/extension mismatch should be visible in diagnostics");

const livePhotoStill = validateImageFileCandidate({ name: "IMG_2222.JPG", type: "image/jpeg", size: 3_000_000, lastModified: Date.now() }, "gallery");
assert.equal(livePhotoStill.ok, true, "Live Photo still JPEG should be accepted as a normal image");

const emptyIcloud = validateImageFileCandidate({ name: "icloud.jpg", type: "image/jpeg", size: 0 }, "gallery");
assert.equal(emptyIcloud.ok, false, "empty cloud-backed files should fail closed");
if (!emptyIcloud.ok) assert.equal(emptyIcloud.error.code, "ICLOUD_FILE_UNAVAILABLE");

const tooLarge = validateImageFileCandidate({ name: "huge-iphone-photo.jpg", type: "image/jpeg", size: IMAGE_UPLOAD_POLICY.maxInputBytes + 1 }, "gallery");
assert.equal(tooLarge.ok, false, "oversized input should fail before upload");
if (!tooLarge.ok) assert.equal(tooLarge.error.code, "IMAGE_TOO_LARGE");

const unsupported = validateImageFileCandidate({ name: "scan.tiff", type: "image/tiff", size: 500_000 }, "gallery");
assert.equal(unsupported.ok, false, "unsupported image types should be rejected");
if (!unsupported.ok) assert.equal(unsupported.error.code, "IMAGE_TYPE_UNSUPPORTED");

const unknown = validateImageFileCandidate({ name: "photo", type: "", size: 500_000 }, "gallery");
assert.equal(unknown.ok, false, "unknown MIME and extension should be rejected");
if (!unknown.ok) assert.equal(unknown.error.code, "IMAGE_MIME_UNKNOWN");

assert.equal(normalizedImageFilename("IMG 1234.HEIC"), "IMG-1234.jpg", "normalized upload filename should become JPG");
assert.equal(IMAGE_UPLOAD_POLICY.fileInputResetRequired, true, "same-file reselection requires input reset");
assert.match(imageUploadRequirementText(), /HEIF/);
assert.equal(messageForImageUploadError("IMAGE_DECODE_FAILED").length > 0, true, "decode failure must map to user copy");
assert.equal(new ImageUploadError("IMAGE_PREVIEW_FAILED", messageForImageUploadError("IMAGE_PREVIEW_FAILED")).code, "IMAGE_PREVIEW_FAILED");

console.log("Image upload policy regression checks passed.");
