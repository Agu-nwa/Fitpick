import sharp from "sharp";
import {
  IMAGE_UPLOAD_POLICY,
  ImageUploadError,
  MAX_IMAGE_UPLOAD_BYTES,
  detectImageByteFormat,
  messageForImageUploadError,
  normalizedImageFilename,
  type ImageUploadFileLike,
  type ImageUploadSource
} from "@/lib/image-upload-policy";

export type NormalizedServerImage = {
  buffer: Buffer;
  filename: string;
  mimeType: "image/webp" | "image/jpeg";
  extension: "webp" | "jpg";
  width: number;
  height: number;
  sizeBytes: number;
  original: {
    filename: string;
    mimeType: string;
    detectedMimeType: string;
    detectedFormat: string;
    sizeBytes: number;
    width: number;
    height: number;
    hasAlpha: boolean;
  };
  warnings: string[];
};

type NormalizeServerInput = {
  buffer: Buffer;
  filename?: string;
  mimeType?: string;
  source?: ImageUploadSource;
};

function fileLike(input: NormalizeServerInput): ImageUploadFileLike {
  return {
    name: input.filename || "fitpick-photo",
    type: input.mimeType || "",
    size: input.buffer.byteLength
  };
}

function assertInputSize(input: NormalizeServerInput) {
  const size = input.buffer.byteLength;
  if (size <= 0) {
    throw new ImageUploadError("IMAGE_NOT_SELECTED", messageForImageUploadError("IMAGE_NOT_SELECTED"), {
      stage: "validating",
      source: input.source || "unknown",
      sizeBytes: size
    });
  }
  if (size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new ImageUploadError("IMAGE_TOO_LARGE", messageForImageUploadError("IMAGE_TOO_LARGE"), {
      stage: "validating",
      source: input.source || "unknown",
      sizeBytes: size
    });
  }
}

async function outputWithBudget(image: sharp.Sharp, hasAlpha: boolean) {
  const webpQualities = [IMAGE_UPLOAD_POLICY.compressionQuality, 0.82, IMAGE_UPLOAD_POLICY.minimumCompressionQuality];
  for (const quality of webpQualities) {
    const buffer = await image.clone().webp({ quality: Math.round(quality * 100), effort: 4 }).toBuffer();
    if (buffer.byteLength > 0 && buffer.byteLength <= MAX_IMAGE_UPLOAD_BYTES) {
      return { buffer, mimeType: "image/webp" as const, extension: "webp" as const };
    }
  }

  const jpegBase = hasAlpha ? image.clone().flatten({ background: "#ffffff" }) : image.clone();
  const jpegQualities = [88, 82, 76];
  for (const quality of jpegQualities) {
    const buffer = await jpegBase.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
    if (buffer.byteLength > 0 && buffer.byteLength <= MAX_IMAGE_UPLOAD_BYTES) {
      return { buffer, mimeType: "image/jpeg" as const, extension: "jpg" as const };
    }
  }

  throw new ImageUploadError("IMAGE_PROCESSING_FAILED", "We couldn't process this image. Try another photo.", { stage: "failed", reason: "normalized_too_large" });
}

export async function normalizeUploadedImageBuffer(input: NormalizeServerInput): Promise<NormalizedServerImage> {
  assertInputSize(input);
  const detected = detectImageByteFormat(input.buffer.subarray(0, Math.min(input.buffer.byteLength, 4096)));
  if (!detected.mimeType) {
    throw new ImageUploadError("IMAGE_MIME_UNKNOWN", messageForImageUploadError("IMAGE_MIME_UNKNOWN"), {
      stage: "validating",
      source: input.source || "unknown",
      ...fileLike(input),
      reason: "unknown_signature"
    });
  }

  try {
    const originalImage = sharp(input.buffer, {
      animated: false,
      limitInputPixels: IMAGE_UPLOAD_POLICY.maxInputPixels,
      failOn: "error"
    });
    const metadata = await originalImage.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const pixels = width * height;
    if (!width || !height || pixels > IMAGE_UPLOAD_POLICY.maxInputPixels) {
      throw new ImageUploadError("IMAGE_PIXEL_LIMIT_EXCEEDED", messageForImageUploadError("IMAGE_PIXEL_LIMIT_EXCEEDED"), {
        stage: "validating",
        source: input.source || "unknown",
        detectedMimeType: detected.mimeType,
        sizeBytes: input.buffer.byteLength,
        reason: "pixel_limit"
      });
    }

    const resize =
      Math.max(width, height) > IMAGE_UPLOAD_POLICY.maxDimensionPx
        ? { width: IMAGE_UPLOAD_POLICY.maxDimensionPx, height: IMAGE_UPLOAD_POLICY.maxDimensionPx, fit: "inside" as const, withoutEnlargement: true }
        : undefined;
    const normalizedImage = originalImage
      .rotate()
      .toColorspace("srgb")
      .resize(resize);

    const hasAlpha = Boolean(metadata.hasAlpha);
    const output = await outputWithBudget(normalizedImage, hasAlpha);
    const outputMetadata = await sharp(output.buffer, { limitInputPixels: IMAGE_UPLOAD_POLICY.maxInputPixels }).metadata();

    return {
      buffer: output.buffer,
      filename: normalizedImageFilename(input.filename || "fitpick-photo", output.extension),
      mimeType: output.mimeType,
      extension: output.extension,
      width: outputMetadata.width || Math.min(width, IMAGE_UPLOAD_POLICY.maxDimensionPx),
      height: outputMetadata.height || Math.min(height, IMAGE_UPLOAD_POLICY.maxDimensionPx),
      sizeBytes: output.buffer.byteLength,
      original: {
        filename: input.filename || "fitpick-photo",
        mimeType: input.mimeType || "",
        detectedMimeType: detected.mimeType,
        detectedFormat: detected.format,
        sizeBytes: input.buffer.byteLength,
        width,
        height,
        hasAlpha
      },
      warnings: detected.format === "gif" ? ["Animated images use the first frame."] : []
    };
  } catch (error) {
    if (error instanceof ImageUploadError) throw error;

    try {
      const recovery = await sharp(input.buffer, {
        animated: false,
        limitInputPixels: IMAGE_UPLOAD_POLICY.maxInputPixels,
        failOn: "none"
      })
        .rotate()
        .toColorspace("srgb")
        .resize({ width: IMAGE_UPLOAD_POLICY.maxDimensionPx, height: IMAGE_UPLOAD_POLICY.maxDimensionPx, fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });

      if (!recovery.data.byteLength || recovery.data.byteLength > MAX_IMAGE_UPLOAD_BYTES) {
        throw new Error("recovery_too_large");
      }

      return {
        buffer: recovery.data,
        filename: normalizedImageFilename(input.filename || "fitpick-photo", "jpg"),
        mimeType: "image/jpeg",
        extension: "jpg",
        width: recovery.info.width || 0,
        height: recovery.info.height || 0,
        sizeBytes: recovery.data.byteLength,
        original: {
          filename: input.filename || "fitpick-photo",
          mimeType: input.mimeType || "",
          detectedMimeType: detected.mimeType,
          detectedFormat: detected.format,
          sizeBytes: input.buffer.byteLength,
          width: 0,
          height: 0,
          hasAlpha: false
        },
        warnings: ["Image was repaired before upload."]
      };
    } catch {
      throw new ImageUploadError("IMAGE_PROCESSING_FAILED", "We couldn't process this image. Try another photo.", {
        stage: "failed",
        source: input.source || "unknown",
        detectedMimeType: detected.mimeType,
        sizeBytes: input.buffer.byteLength,
        reason: "normalization_failed"
      });
    }
  }
}
