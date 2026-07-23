export type SupportedGeneratedImage = {
  contentType: "image/png" | "image/jpeg" | "image/webp";
  format: "png" | "jpeg" | "webp";
};

const maxGeneratedImageBytes = 12 * 1024 * 1024;

export class TryOnImageValidationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "TryOnImageValidationError";
    this.code = code;
  }
}

export function detectGeneratedImageType(buffer: Buffer): SupportedGeneratedImage | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { contentType: "image/png", format: "png" };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { contentType: "image/jpeg", format: "jpeg" };
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { contentType: "image/webp", format: "webp" };
  }
  return null;
}

export function assertGeneratedImageBuffer(buffer: Buffer, declaredContentType = "") {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new TryOnImageValidationError("empty_image", "Generated image was empty.");
  }
  if (buffer.length > maxGeneratedImageBytes) {
    throw new TryOnImageValidationError("image_too_large", "Generated image was too large.");
  }

  const detected = detectGeneratedImageType(buffer);
  if (!detected) {
    throw new TryOnImageValidationError("invalid_image", "Generated output was not a supported image.");
  }

  const normalizedDeclared = declaredContentType.toLowerCase().split(";")[0].trim();
  if (normalizedDeclared && normalizedDeclared !== "application/octet-stream" && normalizedDeclared !== detected.contentType) {
    if (!/^image\/(png|jpe?g|webp)$/i.test(normalizedDeclared)) {
      throw new TryOnImageValidationError("invalid_content_type", "Generated output did not have an image content type.");
    }
  }

  return detected;
}

export function assertUsablePreviewRecord(preview: any) {
  const imageUrl = typeof preview?.imageUrl === "string" ? preview.imageUrl.trim() : "";
  const storageKey = typeof preview?.storageKey === "string" ? preview.storageKey.trim() : "";
  if (preview?.status !== "ready") return false;
  if (!imageUrl || !/^https:\/\//i.test(imageUrl)) return false;
  if (!storageKey) return false;
  return true;
}
