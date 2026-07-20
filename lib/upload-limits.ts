export const MAX_IMAGE_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_UPLOAD_MB = MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024);

export const DEFAULT_ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
] as const;

export function isAllowedImageMimeType(mimeType: string) {
  return DEFAULT_ALLOWED_IMAGE_MIME_TYPES.includes(mimeType.toLowerCase() as any);
}

export function imageUploadRequirementText() {
  return `Choose a JPG, PNG, WebP, or HEIC image under ${MAX_IMAGE_UPLOAD_MB} MB.`;
}
