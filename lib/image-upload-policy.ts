export type ImageUploadStage =
  | "selected"
  | "validating"
  | "preparing"
  | "converting"
  | "generating-preview"
  | "uploading"
  | "analyzing"
  | "completed"
  | "failed";

export type ImageUploadErrorCode =
  | "IMAGE_NOT_SELECTED"
  | "IMAGE_TYPE_UNSUPPORTED"
  | "IMAGE_MIME_UNKNOWN"
  | "IMAGE_TOO_LARGE"
  | "IMAGE_DECODE_FAILED"
  | "IMAGE_CONVERSION_FAILED"
  | "IMAGE_PREVIEW_FAILED"
  | "IMAGE_UPLOAD_FAILED"
  | "IMAGE_PROCESSING_FAILED"
  | "IMAGE_PIXEL_LIMIT_EXCEEDED"
  | "ICLOUD_FILE_UNAVAILABLE";

export type ImageUploadSource = "camera" | "gallery" | "drag_drop" | "avatar_model" | "desktop" | "unknown";

export type ImageUploadFileLike = {
  name?: string;
  type?: string;
  size?: number;
  lastModified?: number;
};

export const MAX_IMAGE_UPLOAD_MB = 50;
export const MAX_IMAGE_UPLOAD_BYTES = MAX_IMAGE_UPLOAD_MB * 1024 * 1024;
export const MAX_IMAGE_INPUT_PIXELS = 120_000_000;
export const NORMALIZED_IMAGE_MAX_DIMENSION_PX = 4096;

export type DetectedImageFormat = "jpeg" | "png" | "webp" | "heic" | "heif" | "avif" | "tiff" | "gif" | "bmp";

export type ImageFormatDetection = {
  format: DetectedImageFormat | "";
  mimeType: string;
  extension: string;
  reason: string;
};

export type ImageUploadDiagnostics = {
  stage?: ImageUploadStage;
  source?: ImageUploadSource;
  fileName?: string;
  mimeType?: string;
  detectedMimeType?: string;
  extension?: string;
  sizeBytes?: number;
  lastModified?: number;
  browser?: string;
  os?: string;
  reason?: string;
};

export class ImageUploadError extends Error {
  code: ImageUploadErrorCode;
  stage: ImageUploadStage;
  diagnostics: ImageUploadDiagnostics;

  constructor(code: ImageUploadErrorCode, message: string, diagnostics: ImageUploadDiagnostics = {}) {
    super(message);
    this.name = "ImageUploadError";
    this.code = code;
    this.stage = diagnostics.stage || "failed";
    this.diagnostics = diagnostics;
  }
}

export const IMAGE_UPLOAD_POLICY = {
  supportedInputMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif", "image/tiff", "image/gif", "image/bmp"] as const,
  supportedExtensions: ["jpg", "jpeg", "png", "webp", "heic", "heif", "avif", "tif", "tiff", "gif", "bmp"] as const,
  acceptedOutputMimeType: "image/webp" as const,
  acceptedOutputExtension: "webp" as const,
  fallbackOutputMimeType: "image/jpeg" as const,
  fallbackOutputExtension: "jpg" as const,
  normalizedStorageMimeTypes: ["image/webp", "image/jpeg"] as const,
  maxInputBytes: MAX_IMAGE_UPLOAD_BYTES,
  maxInputPixels: MAX_IMAGE_INPUT_PIXELS,
  maxDimensionPx: NORMALIZED_IMAGE_MAX_DIMENSION_PX,
  compressionQuality: 0.86,
  minimumCompressionQuality: 0.78,
  decodeTimeoutMs: 15000,
  fileReadTimeoutMs: 15000,
  fileInputResetRequired: true,
  acceptAttribute: "image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,image/avif,image/tiff,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.heic,.heif,.avif,.tif,.tiff,.gif,.bmp"
} as const;

export const DEFAULT_ALLOWED_IMAGE_MIME_TYPES = IMAGE_UPLOAD_POLICY.supportedInputMimeTypes;
export const NORMALIZED_STORAGE_IMAGE_MIME_TYPES = IMAGE_UPLOAD_POLICY.normalizedStorageMimeTypes;

const mimeByExtension: Record<string, typeof IMAGE_UPLOAD_POLICY.supportedInputMimeTypes[number]> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  avif: "image/avif",
  tif: "image/tiff",
  tiff: "image/tiff",
  gif: "image/gif",
  bmp: "image/bmp"
};

const formatByMime: Record<string, DetectedImageFormat> = {
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/avif": "avif",
  "image/tiff": "tiff",
  "image/gif": "gif",
  "image/bmp": "bmp"
};

export function imageUploadRequirementText() {
  return `Choose a common fashion photo under ${MAX_IMAGE_UPLOAD_MB} MB.`;
}

export function getFileExtension(filename = "") {
  const clean = filename.split("?")[0]?.split("#")[0] || "";
  const extension = clean.includes(".") ? clean.split(".").pop()?.toLowerCase() || "" : "";
  return extension.replace(/[^a-z0-9]/g, "");
}

export function normalizeMimeType(mimeType = "") {
  return mimeType.trim().toLowerCase().replace(/^image\/pjpeg$/, "image/jpeg");
}

function bytesStartWith(bytes: Uint8Array, signature: number[]) {
  if (bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  if (bytes.length < start + length) return "";
  return String.fromCharCode(...Array.from(bytes.slice(start, start + length)));
}

export function detectImageByteFormat(input: ArrayBuffer | Uint8Array): ImageFormatDetection {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytesStartWith(bytes, [0xff, 0xd8, 0xff])) return { format: "jpeg", mimeType: "image/jpeg", extension: "jpg", reason: "jpeg_signature" };
  if (bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { format: "png", mimeType: "image/png", extension: "png", reason: "png_signature" };
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return { format: "webp", mimeType: "image/webp", extension: "webp", reason: "webp_signature" };
  if (ascii(bytes, 0, 4) === "GIF8") return { format: "gif", mimeType: "image/gif", extension: "gif", reason: "gif_signature" };
  if ((ascii(bytes, 0, 2) === "II" && bytes[2] === 0x2a && bytes[3] === 0x00) || (ascii(bytes, 0, 2) === "MM" && bytes[2] === 0x00 && bytes[3] === 0x2a)) {
    return { format: "tiff", mimeType: "image/tiff", extension: "tiff", reason: "tiff_signature" };
  }
  if ((ascii(bytes, 0, 2) === "II" && bytes[2] === 0x2b && bytes[3] === 0x00) || (ascii(bytes, 0, 2) === "MM" && bytes[2] === 0x00 && bytes[3] === 0x2b)) {
    return { format: "tiff", mimeType: "image/tiff", extension: "tiff", reason: "bigtiff_signature" };
  }
  if (bytesStartWith(bytes, [0x42, 0x4d])) return { format: "bmp", mimeType: "image/bmp", extension: "bmp", reason: "bmp_signature" };

  const brand = ascii(bytes, 4, 4) === "ftyp" ? ascii(bytes, 8, 4).toLowerCase() : "";
  if (brand) {
    const compatibleBrands = ascii(bytes, 8, Math.min(64, Math.max(0, bytes.length - 8))).toLowerCase();
    if (brand === "avif" || brand === "avis" || compatibleBrands.includes("avif") || compatibleBrands.includes("avis")) {
      return { format: "avif", mimeType: "image/avif", extension: "avif", reason: "avif_ftyp" };
    }
    if (["heic", "heix", "hevc", "hevx"].includes(brand) || /heic|heix|hevc|hevx/.test(compatibleBrands)) {
      return { format: "heic", mimeType: "image/heic", extension: "heic", reason: "heic_ftyp" };
    }
    if (["mif1", "msf1"].includes(brand) || /mif1|msf1/.test(compatibleBrands)) {
      return { format: "heif", mimeType: "image/heif", extension: "heif", reason: "heif_ftyp" };
    }
  }

  return { format: "", mimeType: "", extension: "", reason: "unknown_signature" };
}

export function detectImageFileType(file: ImageUploadFileLike, byteDetection?: ImageFormatDetection) {
  const extension = getFileExtension(file.name || "");
  const mimeType = normalizeMimeType(file.type || "");
  const extensionMimeType = extension ? mimeByExtension[extension] || "" : "";
  const byteMimeType = byteDetection?.mimeType || "";
  const detectedMimeType = byteMimeType || mimeType || extensionMimeType;
  const format = byteDetection?.format || formatByMime[detectedMimeType] || "";

  return {
    extension,
    mimeType,
    extensionMimeType,
    byteMimeType,
    byteDetectedFormat: byteDetection?.format || "",
    detectedBy: byteMimeType ? "bytes" as const : mimeType ? "mime" as const : extensionMimeType ? "extension" as const : "unknown" as const,
    detectedMimeType,
    format,
    hasKnownExtension: Boolean(extensionMimeType),
    isSupportedMimeType: IMAGE_UPLOAD_POLICY.supportedInputMimeTypes.includes(detectedMimeType as any),
    isHeicLike: detectedMimeType === "image/heic" || detectedMimeType === "image/heif" || extension === "heic" || extension === "heif",
    requiresServerNormalization: ["tiff", "bmp"].includes(format),
    isAnimatedInput: format === "gif",
    hasMimeExtensionMismatch: Boolean(mimeType && extensionMimeType && mimeType !== extensionMimeType && !(mimeType === "image/jpg" && extensionMimeType === "image/jpeg"))
  };
}

export function safeImageUploadDiagnostics(file: ImageUploadFileLike, patch: ImageUploadDiagnostics = {}): ImageUploadDiagnostics {
  const detected = detectImageFileType(file);
  return {
    fileName: file.name || "unknown",
    mimeType: normalizeMimeType(file.type || "") || "unknown",
    detectedMimeType: detected.detectedMimeType || "unknown",
    extension: detected.extension || "unknown",
    sizeBytes: typeof file.size === "number" ? file.size : 0,
    lastModified: typeof file.lastModified === "number" ? file.lastModified : 0,
    ...patch
  };
}

export function messageForImageUploadError(code: ImageUploadErrorCode) {
  switch (code) {
    case "IMAGE_NOT_SELECTED":
      return "Choose a photo to continue.";
    case "IMAGE_TYPE_UNSUPPORTED":
      return "We couldn't process this image. Try another photo.";
    case "IMAGE_MIME_UNKNOWN":
      return "We couldn't process this image. Try another photo.";
    case "IMAGE_TOO_LARGE":
      return `This photo is too large. Choose an image under ${MAX_IMAGE_UPLOAD_MB} MB.`;
    case "IMAGE_DECODE_FAILED":
      return "This photo could not be opened. Try opening it in Photos first, then upload again.";
    case "IMAGE_CONVERSION_FAILED":
      return "This iPhone photo could not be prepared for upload. Open it in Photos, wait for it to download, then try again.";
    case "IMAGE_PREVIEW_FAILED":
      return "MyFitPick could not create a preview for this photo. Try another copy of the image.";
    case "IMAGE_UPLOAD_FAILED":
      return "We could not send the photo. Try again, or use a smaller image.";
    case "IMAGE_PROCESSING_FAILED":
      return "MyFitPick could not prepare this photo. Try another image.";
    case "IMAGE_PIXEL_LIMIT_EXCEEDED":
      return "We couldn't process this image. Try another photo.";
    case "ICLOUD_FILE_UNAVAILABLE":
      return "This photo could not be loaded from iCloud. Open it in Photos first, wait for it to download, then try again.";
    default:
      return "MyFitPick could not prepare this photo. Try again.";
  }
}

export function validateImageByteCandidate(file: ImageUploadFileLike | null | undefined, bytes: ArrayBuffer | Uint8Array, source: ImageUploadSource = "unknown") {
  if (!file) {
    return {
      ok: false as const,
      error: new ImageUploadError("IMAGE_NOT_SELECTED", messageForImageUploadError("IMAGE_NOT_SELECTED"), { stage: "selected", source })
    };
  }
  const size = typeof file.size === "number" ? file.size : 0;
  if (size <= 0) {
    return {
      ok: false as const,
      error: new ImageUploadError("ICLOUD_FILE_UNAVAILABLE", messageForImageUploadError("ICLOUD_FILE_UNAVAILABLE"), safeImageUploadDiagnostics(file, { stage: "validating", source }))
    };
  }
  if (size > IMAGE_UPLOAD_POLICY.maxInputBytes) {
    return {
      ok: false as const,
      error: new ImageUploadError("IMAGE_TOO_LARGE", messageForImageUploadError("IMAGE_TOO_LARGE"), safeImageUploadDiagnostics(file, { stage: "validating", source }))
    };
  }
  const byteDetection = detectImageByteFormat(bytes);
  if (!byteDetection.mimeType) {
    return {
      ok: false as const,
      error: new ImageUploadError("IMAGE_MIME_UNKNOWN", messageForImageUploadError("IMAGE_MIME_UNKNOWN"), {
        ...safeImageUploadDiagnostics(file || {}, { stage: "validating", source }),
        reason: "unknown_signature"
      })
    };
  }
  const detected = detectImageFileType(file || {}, byteDetection);
  if (!detected.isSupportedMimeType) {
    return {
      ok: false as const,
      error: new ImageUploadError("IMAGE_TYPE_UNSUPPORTED", messageForImageUploadError("IMAGE_TYPE_UNSUPPORTED"), {
        ...safeImageUploadDiagnostics(file || {}, { stage: "validating", source }),
        detectedMimeType: detected.detectedMimeType,
        reason: "signature_not_supported"
      })
    };
  }
  return { ok: true as const, detected, diagnostics: safeImageUploadDiagnostics(file || {}, { stage: "validating", source, detectedMimeType: detected.detectedMimeType }) };
}

export function validateImageFileCandidate(file: ImageUploadFileLike | null | undefined, source: ImageUploadSource = "unknown") {
  if (!file) {
    return {
      ok: false as const,
      error: new ImageUploadError("IMAGE_NOT_SELECTED", messageForImageUploadError("IMAGE_NOT_SELECTED"), { stage: "selected", source })
    };
  }

  const diagnostics = safeImageUploadDiagnostics(file, { stage: "validating", source });
  const detected = detectImageFileType(file);
  const size = typeof file.size === "number" ? file.size : 0;

  if (size <= 0) {
    return {
      ok: false as const,
      error: new ImageUploadError("ICLOUD_FILE_UNAVAILABLE", messageForImageUploadError("ICLOUD_FILE_UNAVAILABLE"), diagnostics)
    };
  }

  if (size > IMAGE_UPLOAD_POLICY.maxInputBytes) {
    return {
      ok: false as const,
      error: new ImageUploadError("IMAGE_TOO_LARGE", messageForImageUploadError("IMAGE_TOO_LARGE"), diagnostics)
    };
  }

  if (!detected.detectedMimeType && !detected.hasKnownExtension) {
    return {
      ok: false as const,
      error: new ImageUploadError("IMAGE_MIME_UNKNOWN", messageForImageUploadError("IMAGE_MIME_UNKNOWN"), diagnostics)
    };
  }

  if (!detected.isSupportedMimeType) {
    return {
      ok: false as const,
      error: new ImageUploadError("IMAGE_TYPE_UNSUPPORTED", messageForImageUploadError("IMAGE_TYPE_UNSUPPORTED"), diagnostics)
    };
  }

  return { ok: true as const, detected, diagnostics };
}

export function isAllowedImageMimeType(mimeType: string) {
  return IMAGE_UPLOAD_POLICY.supportedInputMimeTypes.includes(normalizeMimeType(mimeType) as any);
}

export function isNormalizedStorageMimeType(mimeType: string) {
  return IMAGE_UPLOAD_POLICY.normalizedStorageMimeTypes.includes(normalizeMimeType(mimeType) as any);
}

export function normalizedImageFilename(filename: string, extension: string = IMAGE_UPLOAD_POLICY.acceptedOutputExtension) {
  const base = (filename || "fitpick-photo")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "fitpick-photo";
  return `${base}.${extension}`;
}
