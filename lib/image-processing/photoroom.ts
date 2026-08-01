import sharp from "sharp";
import { MAX_IMAGE_UPLOAD_BYTES, MAX_IMAGE_INPUT_PIXELS } from "@/lib/image-upload-policy";

const DEFAULT_PHOTOROOM_URL = "https://sdk.photoroom.com/v1/segment";
const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_TIMEOUT_MS = 30_000;
const MAX_PROVIDER_ATTEMPTS = 2;
const RETRY_DELAY_MS = 250;
export const photoRoomBackgroundRemovalVersion = "photoroom-segment-v1";

export type BackgroundRemovalResult =
  | { ok: true; provider: "photoroom"; buffer: Buffer; mimeType: "image/webp"; filename: string; width: number; height: number }
  | {
      ok: false;
      provider: "photoroom";
      warning: string;
      reason: "not_configured" | "timeout" | "authentication_failed" | "rate_limited" | "request_rejected" | "provider_error" | "invalid_response";
      statusCode?: number;
    };

export function isPhotoRoomConfigured() {
  return process.env.BACKGROUND_REMOVAL_PROVIDER?.trim().toLowerCase() === "photoroom" && Boolean(process.env.PHOTOROOM_API_KEY?.trim());
}

function photoRoomUrl() {
  try {
    const url = new URL(process.env.PHOTOROOM_REMOVE_BG_URL?.trim() || DEFAULT_PHOTOROOM_URL);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function waitBeforeRetry(attempt: number) {
  return new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

export async function removeBackgroundWithPhotoRoom(input: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  timeoutMs?: number;
}): Promise<BackgroundRemovalResult> {
  const apiKey = process.env.PHOTOROOM_API_KEY?.trim();
  if (process.env.BACKGROUND_REMOVAL_PROVIDER?.trim().toLowerCase() !== "photoroom" || !apiKey) {
    return { ok: false, provider: "photoroom", reason: "not_configured", warning: "Background removal is not configured; the original photo was used." };
  }

  const endpoint = photoRoomUrl();
  if (!endpoint) {
    return { ok: false, provider: "photoroom", reason: "not_configured", warning: "Background removal is not configured; the original photo was used." };
  }

  const timeoutMs = Math.min(Math.max(input.timeoutMs || DEFAULT_TIMEOUT_MS, 1_000), MAX_TIMEOUT_MS);
  let lastFailure: "timeout" | "provider_error" = "provider_error";

  for (let attempt = 1; attempt <= MAX_PROVIDER_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const form = new FormData();
      form.append("image_file", new Blob([Uint8Array.from(input.buffer)], { type: input.mimeType }), input.filename);
      form.append("format", "webp");

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "x-api-key": apiKey, accept: "image/webp,image/*" },
        body: form,
        signal: controller.signal
      });
      if (!response.ok) {
        const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        if (retryable && attempt < MAX_PROVIDER_ATTEMPTS) {
          await waitBeforeRetry(attempt);
          continue;
        }
        const reason = response.status === 401 || response.status === 403
          ? "authentication_failed"
          : response.status === 429
            ? "rate_limited"
            : response.status >= 400 && response.status < 500
              ? "request_rejected"
              : "provider_error";
        return {
          ok: false,
          provider: "photoroom",
          reason,
          statusCode: response.status,
          warning: reason === "authentication_failed"
            ? "Background removal credentials were rejected; the original photo was used."
            : reason === "rate_limited"
              ? "Background removal usage is temporarily limited; the original photo was used."
              : "Background removal was unavailable; the original photo was used."
        };
      }

      const responseType = response.headers.get("content-type")?.toLowerCase() || "";
      const responseLength = Number(response.headers.get("content-length") || 0);
      if (!responseType.startsWith("image/") || (responseLength > 0 && responseLength > MAX_IMAGE_UPLOAD_BYTES)) {
        return { ok: false, provider: "photoroom", reason: "invalid_response", warning: "Background removal returned an unusable image; the original photo was used." };
      }

      const providerBytes = Buffer.from(await response.arrayBuffer());
      if (!providerBytes.byteLength || providerBytes.byteLength > MAX_IMAGE_UPLOAD_BYTES) {
        return { ok: false, provider: "photoroom", reason: "invalid_response", warning: "Background removal returned an unusable image; the original photo was used." };
      }

      const converted = await sharp(providerBytes, { animated: false, failOn: "error", limitInputPixels: MAX_IMAGE_INPUT_PIXELS })
        .rotate()
        .toColorspace("srgb")
        .webp({ quality: 90, alphaQuality: 100, effort: 4 })
        .toBuffer({ resolveWithObject: true });
      if (!converted.data.byteLength || converted.data.byteLength > MAX_IMAGE_UPLOAD_BYTES || !converted.info.width || !converted.info.height) {
        return { ok: false, provider: "photoroom", reason: "invalid_response", warning: "Background removal returned an unusable image; the original photo was used." };
      }
      if (!converted.info.hasAlpha) {
        return { ok: false, provider: "photoroom", reason: "invalid_response", warning: "Background removal returned an unusable image; the original photo was used." };
      }
      const alpha = (await sharp(converted.data).stats()).channels[3];
      if (!alpha || alpha.min >= 255) {
        return { ok: false, provider: "photoroom", reason: "invalid_response", warning: "Background removal returned an image without transparency; the original photo was used." };
      }

      return {
        ok: true,
        provider: "photoroom",
        buffer: converted.data,
        mimeType: "image/webp",
        filename: input.filename.replace(/\.[^.]+$/, "") + "-cutout.webp",
        width: converted.info.width,
        height: converted.info.height
      };
    } catch (error) {
      lastFailure = isAbortError(error) ? "timeout" : "provider_error";
      if (attempt < MAX_PROVIDER_ATTEMPTS) {
        await waitBeforeRetry(attempt);
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    ok: false,
    provider: "photoroom",
    reason: lastFailure,
    warning: lastFailure === "timeout" ? "Background removal timed out; the original photo was used." : "Background removal was unavailable; the original photo was used."
  };
}
