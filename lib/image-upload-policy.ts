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
  | "ICLOUD_FILE_UNAVAILABLE";

export type ImageUploadSource = "camera" | "gallery" | "drag_drop" | "avatar_model" | "desktop" | "unknown";

export type ImageUploadFileLike = {
  name?: string;
  type?: string;
  size?: number;
  lastModified?: number;
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
  supportedInputMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"] as const,
  supportedExtensions: ["jpg", "jpeg", "png", "webp", "heic", "heif"] as const,
  acceptedOutputMimeType: "image/jpeg" as const,
  acceptedOutputExtension: "jpg" as const,
  maxInputBytes: 20 * 1024 * 1024,
  maxDimensionPx: 4096,
  compressionQuality: 0.9,
  minimumCompressionQuality: 0.78,
  decodeTimeoutMs: 15000,
  fileReadTimeoutMs: 15000,
  fileInputResetRequired: true,
  acceptAttribute: "image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
} as const;

export const DEFAULT_ALLOWED_IMAGE_MIME_TYPES = IMAGE_UPLOAD_POLICY.supportedInputMimeTypes;
export const MAX_IMAGE_UPLOAD_BYTES = IMAGE_UPLOAD_POLICY.maxInputBytes;
export const MAX_IMAGE_UPLOAD_MB = MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024);

const mimeByExtension: Record<string, typeof IMAGE_UPLOAD_POLICY.supportedInputMimeTypes[number]> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif"
};

export function imageUploadRequirementText() {
  return `Choose a JPG, PNG, WebP, HEIC, or HEIF image under ${MAX_IMAGE_UPLOAD_MB} MB.`;
}

export function getFileExtension(filename = "") {
  const clean = filename.split("?")[0]?.split("#")[0] || "";
  const extension = clean.includes(".") ? clean.split(".").pop()?.toLowerCase() || "" : "";
  return extension.replace(/[^a-z0-9]/g, "");
}

export function normalizeMimeType(mimeType = "") {
  return mimeType.trim().toLowerCase().replace(/^image\/pjpeg$/, "image/jpeg");
}

export function detectImageFileType(file: ImageUploadFileLike) {
  const extension = getFileExtension(file.name || "");
  const mimeType = normalizeMimeType(file.type || "");
  const extensionMimeType = extension ? mimeByExtension[extension] || "" : "";
  const detectedMimeType = mimeType || extensionMimeType;

  return {
    extension,
    mimeType,
    extensionMimeType,
    detectedMimeType,
    hasKnownExtension: Boolean(extensionMimeType),
    isSupportedMimeType: IMAGE_UPLOAD_POLICY.supportedInputMimeTypes.includes(detectedMimeType as any),
    isHeicLike: detectedMimeType === "image/heic" || detectedMimeType === "image/heif" || extension === "heic" || extension === "heif",
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
      return "Choose a JPG, PNG, WebP, HEIC, or HEIF photo.";
    case "IMAGE_MIME_UNKNOWN":
      return "MyFitPick could not identify this photo format. Try saving it as JPG and upload again.";
    case "IMAGE_TOO_LARGE":
      return `This photo is too large. Choose an image under ${MAX_IMAGE_UPLOAD_MB} MB.`;
    case "IMAGE_DECODE_FAILED":
      return "This photo could not be opened by your browser. Try opening it in Photos first, then upload again.";
    case "IMAGE_CONVERSION_FAILED":
      return "This iPhone photo could not be prepared for upload. Open it in Photos, wait for it to download, then try again.";
    case "IMAGE_PREVIEW_FAILED":
      return "MyFitPick could not create a preview for this photo. Try another copy of the image.";
    case "IMAGE_UPLOAD_FAILED":
      return "We could not send the photo to storage. Try again, or use a smaller JPG image.";
    case "IMAGE_PROCESSING_FAILED":
      return "MyFitPick could not prepare this photo. Try another image.";
    case "ICLOUD_FILE_UNAVAILABLE":
      return "This photo could not be loaded from iCloud. Open it in Photos first, wait for it to download, then try again.";
    default:
      return "MyFitPick could not prepare this photo. Try again.";
  }
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

export function normalizedImageFilename(filename: string, extension = IMAGE_UPLOAD_POLICY.acceptedOutputExtension) {
  const base = (filename || "fitpick-photo")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "fitpick-photo";
  return `${base}.${extension}`;
}
