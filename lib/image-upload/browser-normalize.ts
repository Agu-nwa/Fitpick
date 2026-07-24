import * as Sentry from "@sentry/nextjs";
import {
  IMAGE_UPLOAD_POLICY,
  ImageUploadError,
  type ImageUploadDiagnostics,
  type ImageUploadSource,
  type ImageUploadStage,
  detectImageFileType,
  messageForImageUploadError,
  normalizedImageFilename,
  safeImageUploadDiagnostics,
  validateImageByteCandidate,
  validateImageFileCandidate
} from "@/lib/image-upload-policy";

export type NormalizedImageUpload = {
  file: File;
  previewUrl: string;
  width?: number;
  height?: number;
  original: ImageUploadDiagnostics;
  normalizedMimeType: string;
  normalizedSizeBytes: number;
  serverNormalizationRequired?: boolean;
  warnings: string[];
};

type NormalizeOptions = {
  source?: ImageUploadSource;
  onStage?: (stage: ImageUploadStage, diagnostics?: ImageUploadDiagnostics) => void;
};

function browserSummary() {
  if (typeof navigator === "undefined") return { browser: "server", os: "server" };
  const ua = navigator.userAgent || "unknown";
  const os = /iphone|ipad|ipod/i.test(ua)
    ? "ios"
    : /android/i.test(ua)
      ? "android"
      : /mac os x/i.test(ua)
        ? "macos"
        : /windows/i.test(ua)
          ? "windows"
          : "unknown";
  const browser = /crios|chrome/i.test(ua)
    ? "chrome"
    : /firefox/i.test(ua)
      ? "firefox"
      : /safari/i.test(ua)
        ? "safari"
        : "unknown";
  return { browser, os };
}

function withBrowserDiagnostics(file: File, patch: ImageUploadDiagnostics = {}) {
  return safeImageUploadDiagnostics(file, { ...browserSummary(), ...patch });
}

function breadcrumb(stage: ImageUploadStage, diagnostics: ImageUploadDiagnostics) {
  const safeData = {
    stage,
    source: diagnostics.source,
    mimeType: diagnostics.mimeType,
    detectedMimeType: diagnostics.detectedMimeType,
    extension: diagnostics.extension,
    sizeBytes: diagnostics.sizeBytes,
    browser: diagnostics.browser,
    os: diagnostics.os,
    reason: diagnostics.reason
  };

  Sentry.addBreadcrumb({
    category: "wardrobe.image_upload",
    message: `wardrobe_image_${stage}`,
    level: stage === "failed" ? "error" : "info",
    data: safeData
  });
}

function fail(code: ConstructorParameters<typeof ImageUploadError>[0], file: File, patch: ImageUploadDiagnostics = {}, cause?: unknown): never {
  const error = new ImageUploadError(code, messageForImageUploadError(code), withBrowserDiagnostics(file, { stage: "failed", ...patch }));
  Sentry.captureException(cause instanceof Error ? cause : error, {
    tags: { area: "image_upload", code },
    extra: error.diagnostics
  });
  throw error;
}

function emit(stage: ImageUploadStage, file: File, options: NormalizeOptions, patch: ImageUploadDiagnostics = {}) {
  const diagnostics = withBrowserDiagnostics(file, { stage, source: options.source || "unknown", ...patch });
  breadcrumb(stage, diagnostics);
  options.onStage?.(stage, diagnostics);
  return diagnostics;
}

function timeout<T>(promise: Promise<T>, ms: number, onTimeout: () => never) {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      window.setTimeout(() => {
        try {
          onTimeout();
        } catch (error) {
          reject(error);
        }
      }, ms);
    })
  ]);
}

async function ensureReadable(file: File, options: NormalizeOptions) {
  emit("preparing", file, options);
  try {
    const head = await timeout(file.slice(0, Math.min(file.size, 4096)).arrayBuffer(), IMAGE_UPLOAD_POLICY.fileReadTimeoutMs, () => {
      throw new ImageUploadError("ICLOUD_FILE_UNAVAILABLE", messageForImageUploadError("ICLOUD_FILE_UNAVAILABLE"), withBrowserDiagnostics(file, { stage: "preparing", source: options.source || "unknown", reason: "read_timeout" }));
    });
    return new Uint8Array(head);
  } catch (error) {
    if (error instanceof ImageUploadError) throw error;
    fail("ICLOUD_FILE_UNAVAILABLE", file, { stage: "preparing", source: options.source || "unknown", reason: "read_failed" }, error);
  }
}

async function convertHeicToJpeg(file: File, options: NormalizeOptions) {
  emit("converting", file, options, { reason: "heic_heif" });
  const heic2any = (await import("heic2any")).default as (input: {
    blob: Blob;
    toType: string;
    quality?: number;
  }) => Promise<Blob | Blob[]>;
  const converted = await heic2any({ blob: file, toType: IMAGE_UPLOAD_POLICY.fallbackOutputMimeType, quality: IMAGE_UPLOAD_POLICY.compressionQuality });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  if (!blob || blob.size <= 0) throw new Error("empty_heic_conversion");
  return new File([blob], normalizedImageFilename(file.name, IMAGE_UPLOAD_POLICY.fallbackOutputExtension), {
    type: IMAGE_UPLOAD_POLICY.fallbackOutputMimeType,
    lastModified: file.lastModified || Date.now()
  });
}

async function decodeImage(file: File, options: NormalizeOptions): Promise<ImageBitmap | HTMLImageElement> {
  emit("generating-preview", file, options);

  if (typeof createImageBitmap === "function") {
    try {
      return await timeout(
        createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions),
        IMAGE_UPLOAD_POLICY.decodeTimeoutMs,
        () => {
          throw new ImageUploadError("IMAGE_DECODE_FAILED", messageForImageUploadError("IMAGE_DECODE_FAILED"), withBrowserDiagnostics(file, { stage: "generating-preview", source: options.source || "unknown", reason: "decode_timeout" }));
        }
      );
    } catch {
      // Safari support varies; fall back to HTMLImageElement below.
    }
  }

  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    const timer = window.setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new ImageUploadError("IMAGE_DECODE_FAILED", messageForImageUploadError("IMAGE_DECODE_FAILED"), withBrowserDiagnostics(file, { stage: "generating-preview", source: options.source || "unknown", reason: "image_load_timeout" })));
    }, IMAGE_UPLOAD_POLICY.decodeTimeoutMs);

    image.onload = () => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
      reject(new ImageUploadError("IMAGE_DECODE_FAILED", messageForImageUploadError("IMAGE_DECODE_FAILED"), withBrowserDiagnostics(file, { stage: "generating-preview", source: options.source || "unknown", reason: "image_load_failed" })));
    };
    image.src = url;
  });
}

function dimensionsOf(image: ImageBitmap | HTMLImageElement) {
  const width = "naturalWidth" in image ? image.naturalWidth || image.width : image.width;
  const height = "naturalHeight" in image ? image.naturalHeight || image.height : image.height;
  if (!width || !height) throw new Error("missing_dimensions");
  return { width, height };
}

async function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number) {
  return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, quality));
}

async function normalizeDecodedImage(file: File, image: ImageBitmap | HTMLImageElement) {
  const { width, height } = dimensionsOf(image);
  const max = IMAGE_UPLOAD_POLICY.maxDimensionPx;
  const scale = Math.min(1, max / Math.max(width, height));
  const outputWidth = Math.max(1, Math.round(width * scale));
  const outputHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("canvas_unavailable");
  context.clearRect(0, 0, outputWidth, outputHeight);
  context.drawImage(image, 0, 0, outputWidth, outputHeight);

  const qualities = [IMAGE_UPLOAD_POLICY.compressionQuality, 0.86, 0.82, IMAGE_UPLOAD_POLICY.minimumCompressionQuality];
  let blob: Blob | null = null;
  let mimeType: "image/webp" | "image/jpeg" = IMAGE_UPLOAD_POLICY.acceptedOutputMimeType;
  for (const quality of qualities) {
    blob = await canvasToBlob(canvas, IMAGE_UPLOAD_POLICY.acceptedOutputMimeType, quality);
    if (blob && blob.size > 0 && blob.size <= IMAGE_UPLOAD_POLICY.maxInputBytes) break;
  }

  if (!blob || blob.size <= 0 || blob.size > IMAGE_UPLOAD_POLICY.maxInputBytes) {
    const jpegCanvas = document.createElement("canvas");
    jpegCanvas.width = outputWidth;
    jpegCanvas.height = outputHeight;
    const jpegContext = jpegCanvas.getContext("2d", { alpha: false });
    if (!jpegContext) throw new Error("canvas_unavailable");
    jpegContext.fillStyle = "#ffffff";
    jpegContext.fillRect(0, 0, outputWidth, outputHeight);
    jpegContext.drawImage(canvas, 0, 0);
    mimeType = IMAGE_UPLOAD_POLICY.fallbackOutputMimeType;
    for (const quality of qualities) {
      blob = await canvasToBlob(jpegCanvas, IMAGE_UPLOAD_POLICY.fallbackOutputMimeType, quality);
      if (blob && blob.size > 0 && blob.size <= IMAGE_UPLOAD_POLICY.maxInputBytes) break;
    }
  }

  if (!blob || blob.size <= 0) throw new Error("canvas_blob_failed");
  if (blob.size > IMAGE_UPLOAD_POLICY.maxInputBytes) throw new Error("normalized_too_large");

  const normalized = new File([blob], normalizedImageFilename(file.name, mimeType === IMAGE_UPLOAD_POLICY.acceptedOutputMimeType ? IMAGE_UPLOAD_POLICY.acceptedOutputExtension : IMAGE_UPLOAD_POLICY.fallbackOutputExtension), {
    type: mimeType,
    lastModified: file.lastModified || Date.now()
  });

  return { file: normalized, width: outputWidth, height: outputHeight };
}

export async function normalizeImageForUpload(file: File, options: NormalizeOptions = {}): Promise<NormalizedImageUpload> {
  emit("selected", file, options);
  const validation = validateImageFileCandidate(file, options.source || "unknown");
  if (!validation.ok && !["IMAGE_TYPE_UNSUPPORTED", "IMAGE_MIME_UNKNOWN"].includes(validation.error.code)) {
    breadcrumb("failed", validation.error.diagnostics);
    Sentry.captureException(validation.error, { tags: { area: "image_upload", code: validation.error.code }, extra: validation.error.diagnostics });
    throw validation.error;
  }

  const headBytes = await ensureReadable(file, options);
  const byteValidation = validateImageByteCandidate(file, headBytes, options.source || "unknown");
  if (!byteValidation.ok) {
    breadcrumb("failed", byteValidation.error.diagnostics);
    Sentry.captureException(byteValidation.error, { tags: { area: "image_upload", code: byteValidation.error.code }, extra: byteValidation.error.diagnostics });
    throw byteValidation.error;
  }

  emit("validating", file, options, {
    detectedMimeType: byteValidation.detected.detectedMimeType,
    reason: byteValidation.detected.hasMimeExtensionMismatch ? "mime_extension_mismatch" : byteValidation.detected.detectedBy
  });

  const original = withBrowserDiagnostics(file, { stage: "selected", source: options.source || "unknown" });
  const detected = detectImageFileType(file, { format: byteValidation.detected.format, mimeType: byteValidation.detected.detectedMimeType, extension: byteValidation.detected.extension || "", reason: byteValidation.detected.detectedBy });
  let prepared = file;
  if (detected.isHeicLike) {
    try {
      prepared = await convertHeicToJpeg(file, options);
    } catch {
      const previewUrl = URL.createObjectURL(file);
      return {
        file: new File([file], file.name || "fitpick-photo", { type: detected.detectedMimeType || file.type || "", lastModified: file.lastModified || Date.now() }),
        previewUrl,
        original,
        normalizedMimeType: detected.detectedMimeType || file.type || "",
        normalizedSizeBytes: file.size,
        serverNormalizationRequired: true,
        warnings: []
      };
    }
  }

  let normalizedFile = prepared;
  let width: number | undefined;
  let height: number | undefined;
  const warnings: string[] = [];

  try {
    const decoded = await decodeImage(prepared, options);
    const normalized = await normalizeDecodedImage(prepared, decoded);
    if ("close" in decoded && typeof decoded.close === "function") decoded.close();
    normalizedFile = normalized.file;
    width = normalized.width;
    height = normalized.height;
  } catch (error) {
    if (byteValidation.detected.isSupportedMimeType) {
      const previewUrl = URL.createObjectURL(file);
      return {
        file: new File([file], file.name || "fitpick-photo", { type: detected.detectedMimeType || file.type || "", lastModified: file.lastModified || Date.now() }),
        previewUrl,
        original,
        normalizedMimeType: detected.detectedMimeType || file.type || "",
        normalizedSizeBytes: file.size,
        serverNormalizationRequired: true,
        warnings: ["Image will be prepared after upload."]
      };
    }
    fail(detected.isHeicLike ? "IMAGE_CONVERSION_FAILED" : "IMAGE_DECODE_FAILED", file, { stage: "generating-preview", source: options.source || "unknown", reason: error instanceof Error ? error.message : "decode_failed" }, error);
  }

  let previewUrl = "";
  try {
    previewUrl = URL.createObjectURL(normalizedFile);
  } catch (error) {
    fail("IMAGE_PREVIEW_FAILED", file, { stage: "generating-preview", source: options.source || "unknown", reason: "object_url_failed" }, error);
  }

  emit("completed", normalizedFile, options, { reason: "normalized" });
  return {
    file: normalizedFile,
    previewUrl,
    width,
    height,
    original,
    normalizedMimeType: normalizedFile.type || IMAGE_UPLOAD_POLICY.acceptedOutputMimeType,
    normalizedSizeBytes: normalizedFile.size,
    warnings
  };
}

export function imageUploadErrorMessage(error: unknown) {
  if (error instanceof ImageUploadError) return error.message;
  return messageForImageUploadError("IMAGE_PROCESSING_FAILED");
}
