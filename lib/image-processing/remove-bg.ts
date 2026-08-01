import sharp from "sharp";
import { MAX_IMAGE_UPLOAD_BYTES, MAX_IMAGE_INPUT_PIXELS } from "@/lib/image-upload-policy";

const DEFAULT_REMOVE_BG_URL = "https://api.remove.bg/v1.0/removebg";
const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_TIMEOUT_MS = 30_000;
const MAX_PROVIDER_ATTEMPTS = 2;
const RETRY_DELAY_MS = 250;
export const removeBgBackgroundRemovalVersion = "remove-bg-v1";

export type BackgroundRemovalResult =
  | { ok: true; provider: "removebg"; buffer: Buffer; mimeType: "image/webp"; filename: string; width: number; height: number }
  | {
      ok: false;
      provider: "removebg";
      warning: string;
      reason: "not_configured" | "timeout" | "authentication_failed" | "rate_limited" | "request_rejected" | "provider_error" | "invalid_response";
      statusCode?: number;
    };

export function isRemoveBgConfigured() {
  return process.env.BACKGROUND_REMOVAL_PROVIDER?.trim().toLowerCase() === "removebg" && Boolean(process.env.REMOVE_BG_API_KEY?.trim());
}

function removeBgUrl() {
  try {
    const url = new URL(process.env.REMOVE_BG_URL?.trim() || DEFAULT_REMOVE_BG_URL);
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

export async function removeBackgroundWithRemoveBg(input: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  timeoutMs?: number;
}): Promise<BackgroundRemovalResult> {
  const apiKey = process.env.REMOVE_BG_API_KEY?.trim();
  if (process.env.BACKGROUND_REMOVAL_PROVIDER?.trim().toLowerCase() !== "removebg" || !apiKey) {
    return { ok: false, provider: "removebg", reason: "not_configured", warning: "Background removal is not configured; the original photo was used." };
  }

  const endpoint = removeBgUrl();
  if (!endpoint) {
    return { ok: false, provider: "removebg", reason: "not_configured", warning: "Background removal is not configured; the original photo was used." };
  }

  const timeoutMs = Math.min(Math.max(input.timeoutMs || DEFAULT_TIMEOUT_MS, 1_000), MAX_TIMEOUT_MS);
  let lastFailure: "timeout" | "provider_error" = "provider_error";

  for (let attempt = 1; attempt <= MAX_PROVIDER_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const form = new FormData();
      form.append("image_file", new Blob([Uint8Array.from(input.buffer)], { type: input.mimeType }), input.filename);
      form.append("size", "auto");
      form.append("format", "webp");

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "X-Api-Key": apiKey, accept: "image/webp,image/*" },
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
          provider: "removebg",
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
        return { ok: false, provider: "removebg", reason: "invalid_response", warning: "Background removal returned an unusable image; the original photo was used." };
      }

      const providerBytes = Buffer.from(await response.arrayBuffer());
      if (!providerBytes.byteLength || providerBytes.byteLength > MAX_IMAGE_UPLOAD_BYTES) {
        return { ok: false, provider: "removebg", reason: "invalid_response", warning: "Background removal returned an unusable image; the original photo was used." };
      }

      const converted = await sharp(providerBytes, { animated: false, failOn: "error", limitInputPixels: MAX_IMAGE_INPUT_PIXELS })
        .rotate()
        .toColorspace("srgb")
        .webp({ quality: 90, alphaQuality: 100, effort: 4 })
        .toBuffer({ resolveWithObject: true });
      if (!converted.data.byteLength || converted.data.byteLength > MAX_IMAGE_UPLOAD_BYTES || !converted.info.width || !converted.info.height) {
        return { ok: false, provider: "removebg", reason: "invalid_response", warning: "Background removal returned an unusable image; the original photo was used." };
      }
      if (!converted.info.hasAlpha) {
        return { ok: false, provider: "removebg", reason: "invalid_response", warning: "Background removal returned an unusable image; the original photo was used." };
      }
      const alpha = (await sharp(converted.data).stats()).channels[3];
      if (!alpha || alpha.min >= 255) {
        return { ok: false, provider: "removebg", reason: "invalid_response", warning: "Background removal returned an image without transparency; the original photo was used." };
      }

      return {
        ok: true,
        provider: "removebg",
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
    provider: "removebg",
    reason: lastFailure,
    warning: lastFailure === "timeout" ? "Background removal timed out; the original photo was used." : "Background removal was unavailable; the original photo was used."
  };
}
