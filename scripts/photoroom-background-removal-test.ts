import assert from "node:assert/strict";
import sharp from "sharp";
import { removeBackgroundWithPhotoRoom } from "@/lib/image-processing/photoroom";

const originalFetch = globalThis.fetch;
const originalProvider = process.env.BACKGROUND_REMOVAL_PROVIDER;
const originalApiKey = process.env.PHOTOROOM_API_KEY;
const originalUrl = process.env.PHOTOROOM_REMOVE_BG_URL;

async function main() {
try {
  process.env.BACKGROUND_REMOVAL_PROVIDER = "photoroom";
  process.env.PHOTOROOM_API_KEY = "test-key-not-for-logging";
  process.env.PHOTOROOM_REMOVE_BG_URL = "https://sdk.photoroom.com/v1/segment";

  const source = await sharp({
    create: { width: 4, height: 4, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.5 } }
  }).png().toBuffer();

  let attempts = 0;
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    attempts += 1;
    assert.equal(init?.method, "POST");
    assert.equal(new Headers(init?.headers).get("x-api-key"), "test-key-not-for-logging");
    assert.ok(init?.body instanceof FormData);
    assert.ok((init.body as FormData).get("image_file") instanceof Blob);
    assert.equal((init.body as FormData).get("format"), "webp");
    if (attempts === 1) return new Response("temporary", { status: 503 });
    return new Response(source, { status: 200, headers: { "content-type": "image/png" } });
  }) as typeof fetch;

  const result = await removeBackgroundWithPhotoRoom({
    buffer: source,
    filename: "garment.png",
    mimeType: "image/png",
    timeoutMs: 1_000
  });

  assert.equal(attempts, 2);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.mimeType, "image/webp");
    assert.equal(result.filename, "garment-cutout.webp");
    assert.ok(result.buffer.byteLength > 0);
  }

  const opaque = await sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 120, g: 80, b: 40 } } }).png().toBuffer();
  globalThis.fetch = (async () => new Response(opaque, { status: 200, headers: { "content-type": "image/png" } })) as typeof fetch;
  const opaqueResult = await removeBackgroundWithPhotoRoom({ buffer: source, filename: "garment.png", mimeType: "image/png", timeoutMs: 1_000 });
  assert.equal(opaqueResult.ok, false, "Opaque provider output must not be reported as a completed cutout.");
  if (!opaqueResult.ok) assert.equal(opaqueResult.reason, "invalid_response");

  globalThis.fetch = (async () => new Response("unauthorized", { status: 401 })) as typeof fetch;
  const unauthorizedResult = await removeBackgroundWithPhotoRoom({ buffer: source, filename: "garment.png", mimeType: "image/png", timeoutMs: 1_000 });
  assert.equal(unauthorizedResult.ok, false);
  if (!unauthorizedResult.ok) {
    assert.equal(unauthorizedResult.reason, "authentication_failed");
    assert.equal(unauthorizedResult.statusCode, 401);
  }

  globalThis.fetch = (async () => new Response("limited", { status: 429 })) as typeof fetch;
  const limitedResult = await removeBackgroundWithPhotoRoom({ buffer: source, filename: "garment.png", mimeType: "image/png", timeoutMs: 1_000 });
  assert.equal(limitedResult.ok, false);
  if (!limitedResult.ok) assert.equal(limitedResult.reason, "rate_limited");

  process.env.PHOTOROOM_REMOVE_BG_URL = "http://insecure.example.test/segment";
  const invalidEndpoint = await removeBackgroundWithPhotoRoom({ buffer: source, filename: "garment.png", mimeType: "image/png" });
  assert.equal(invalidEndpoint.ok, false);
  if (!invalidEndpoint.ok) assert.equal(invalidEndpoint.reason, "not_configured");

  process.stdout.write("PhotoRoom background-removal regression checks passed.\n");
} finally {
  globalThis.fetch = originalFetch;
  if (originalProvider === undefined) delete process.env.BACKGROUND_REMOVAL_PROVIDER;
  else process.env.BACKGROUND_REMOVAL_PROVIDER = originalProvider;
  if (originalApiKey === undefined) delete process.env.PHOTOROOM_API_KEY;
  else process.env.PHOTOROOM_API_KEY = originalApiKey;
  if (originalUrl === undefined) delete process.env.PHOTOROOM_REMOVE_BG_URL;
  else process.env.PHOTOROOM_REMOVE_BG_URL = originalUrl;
}
}

void main();
