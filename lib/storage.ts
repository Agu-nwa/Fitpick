import crypto from "crypto";
import { assertEnvReady } from "@/lib/config/env";
import { resolveAwsCredentials, validateS3CredentialPair } from "@/lib/storage/aws-credentials";
import { deleteGeneratedImage, getGeneratedImageUrl } from "@/lib/storage/generated-images";
import { normalizeStorageKey } from "@/lib/storage/url";
import { DEFAULT_ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES, MAX_IMAGE_UPLOAD_MB } from "@/lib/upload-limits";

export type StorageProvider = "s3";

const service = "s3";
const extensionByMime: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif"
};

export function storageProvider(): StorageProvider {
  return "s3";
}

function s3Config() {
  return {
    bucket: process.env.S3_BUCKET || process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || "",
    region: process.env.S3_REGION || process.env.AWS_REGION || "",
  };
}

function isS3Ready() {
  assertEnvReady({ strict: process.env.NODE_ENV === "production" });
  validateS3CredentialPair();
  const config = s3Config();
  return Boolean(config.bucket && config.region);
}

function hmac(key: Buffer | string, value: string) {
  return crypto.createHmac("sha256", key).update(value).digest();
}

function hash(value: string | Buffer) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function dateStamp(amz: string) {
  return amz.slice(0, 8);
}

function signingKey(secret: string, stamp: string, region: string) {
  const kDate = hmac(`AWS4${secret}`, stamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

function amzDate(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function encodePathPart(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function objectHost(bucket: string, region: string) {
  return region === "us-east-1" ? `${bucket}.s3.amazonaws.com` : `${bucket}.s3.${region}.amazonaws.com`;
}

function canonicalQuery(params: Record<string, string>) {
  return Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join("&");
}

export function getAllowedImageTypes() {
  const configured = (process.env.ALLOWED_IMAGE_MIME_TYPES || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return configured.length ? configured : [...DEFAULT_ALLOWED_IMAGE_MIME_TYPES];
}

export function getMaxImageSizeBytes() {
  return MAX_IMAGE_UPLOAD_BYTES;
}

export function validateImageMetadata(input: { mimeType: string; sizeBytes: number }) {
  const allowedMimeTypes = getAllowedImageTypes();
  const normalizedMime = input.mimeType.toLowerCase();

  return {
    valid: allowedMimeTypes.includes(normalizedMime as any) && normalizedMime.startsWith("image/") && input.sizeBytes > 0 && input.sizeBytes <= MAX_IMAGE_UPLOAD_BYTES,
    allowedMimeTypes,
    maxSizeBytes: MAX_IMAGE_UPLOAD_BYTES
  };
}

export function assertStorageConfigured() {
  const provider = storageProvider();
  const ready = provider === "s3" && isS3Ready();

  return {
    provider,
    ready,
    message: ready ? "S3 image upload is configured." : "S3 image upload is not configured yet."
  };
}

export function createStorageKey(input: { userId: string; filename: string; purpose?: string }) {
  const extension = input.filename.includes(".") ? input.filename.split(".").pop()?.toLowerCase() : "";
  const safeFilename = input.filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  return normalizeStorageKey(`wardrobe/${input.userId}/${input.purpose || "original"}-${Date.now()}-${crypto.randomUUID()}-${safeFilename || `upload.${extension || "jpg"}`}`);
}

export function storageKeyBelongsToUser(input: { userId: string; storageKey?: string; prefix?: "wardrobe" | "generated-previews" | "avatar-previews" }) {
  const key = normalizeStorageKey(input.storageKey || "");
  if (!key) return false;
  const prefix = input.prefix || "wardrobe";
  return key.startsWith(`${prefix}/${input.userId}/`);
}

export function createWardrobeStorageKey(input: { userId: string; filename: string }) {
  return createStorageKey({ ...input, purpose: "wardrobe" });
}

async function createPresignedPutUrl(input: { storageKey: string; mimeType: string; expiresSeconds?: number }) {
  const config = s3Config();
  const credentials = await resolveAwsCredentials();
  const now = amzDate();
  const stamp = now.slice(0, 8);
  const scope = `${stamp}/${config.region}/${service}/aws4_request`;
  const host = objectHost(config.bucket, config.region);
  const signedHeaders = "host";
  const credential = `${credentials.accessKeyId}/${scope}`;
  const params: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": now,
    "X-Amz-Expires": String(input.expiresSeconds || 900),
    "X-Amz-SignedHeaders": signedHeaders
  };
  if (credentials.sessionToken) params["X-Amz-Security-Token"] = credentials.sessionToken;
  const canonicalUri = `/${normalizeStorageKey(input.storageKey).split("/").map(encodePathPart).join("/")}`;
  const canonicalRequest = ["PUT", canonicalUri, canonicalQuery(params), `host:${host}\n`, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", now, scope, hash(canonicalRequest)].join("\n");
  const signature = crypto.createHmac("sha256", signingKey(credentials.secretAccessKey, stamp, config.region)).update(stringToSign).digest("hex");
  return `https://${host}${canonicalUri}?${canonicalQuery({ ...params, "X-Amz-Signature": signature })}`;
}

export async function createSignedUploadUrl(input: {
  userId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  purpose?: string;
}) {
  const storage = assertStorageConfigured();
  const validation = validateImageMetadata(input);
  const extension = extensionByMime[input.mimeType.toLowerCase()] || input.filename.split(".").pop() || "jpg";
  const filename = input.filename.includes(".") ? input.filename : `${input.filename}.${extension}`;
  const storageKey = createStorageKey({ userId: input.userId, filename, purpose: input.purpose });

  if (!validation.valid) {
    return {
      ready: false,
      provider: storage.provider,
      storageKey,
      maxSizeBytes: validation.maxSizeBytes,
      allowedMimeTypes: validation.allowedMimeTypes,
      message: `Choose a JPG, PNG, WebP, or HEIC image under ${MAX_IMAGE_UPLOAD_MB} MB.`,
      nextAction: "choose_supported_image"
    };
  }

  if (!storage.ready) {
    return {
      ready: false,
      provider: storage.provider,
      storageKey,
      maxSizeBytes: validation.maxSizeBytes,
      allowedMimeTypes: validation.allowedMimeTypes,
      message: "S3 image upload is not configured yet.",
      nextAction: "configure_s3"
    };
  }

  return {
    ready: true,
    provider: "s3",
    storageKey,
    uploadUrl: await createPresignedPutUrl({ storageKey, mimeType: input.mimeType }),
    method: "PUT",
    headers: {
      "content-type": input.mimeType
    },
    publicUrl: await getGeneratedImageUrl(storageKey),
    maxSizeBytes: validation.maxSizeBytes,
    allowedMimeTypes: validation.allowedMimeTypes,
    nextAction: "upload_to_s3"
  };
}

export async function uploadImageObject(input: { storageKey: string; mimeType: string; body: Buffer }) {
  const storage = assertStorageConfigured();
  const validation = validateImageMetadata({ mimeType: input.mimeType, sizeBytes: input.body.byteLength });
  if (!validation.valid) throw new Error(`Choose a supported image under ${MAX_IMAGE_UPLOAD_MB} MB.`);
  if (!storage.ready) throw new Error("S3 image upload is not configured yet.");

  const config = s3Config();
  const credentials = await resolveAwsCredentials();
  const storageKey = normalizeStorageKey(input.storageKey);
  const host = objectHost(config.bucket, config.region);
  const now = amzDate();
  const stamp = dateStamp(now);
  const payloadHash = hash(input.body);
  const canonicalUri = `/${storageKey.split("/").map(encodePathPart).join("/")}`;
  const tokenHeader = credentials.sessionToken ? `x-amz-security-token:${credentials.sessionToken}\n` : "";
  const canonicalHeaders = `content-type:${input.mimeType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${now}\n${tokenHeader}`;
  const signedHeaders = credentials.sessionToken
    ? "content-type;host;x-amz-content-sha256;x-amz-date;x-amz-security-token"
    : "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${stamp}/${config.region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", now, scope, hash(canonicalRequest)].join("\n");
  const signature = crypto.createHmac("sha256", signingKey(credentials.secretAccessKey, stamp, config.region)).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const headers: Record<string, string> = {
    authorization,
    "content-type": input.mimeType,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": now
  };
  if (credentials.sessionToken) headers["x-amz-security-token"] = credentials.sessionToken;

  const response = await fetch(`https://${host}${canonicalUri}`, {
    method: "PUT",
    headers,
    body: input.body as unknown as BodyInit
  });

  if (!response.ok) throw new Error(`S3 upload failed with status ${response.status}.`);

  return {
    provider: "s3" as const,
    storageKey,
    url: await getGeneratedImageUrl(storageKey),
    mimeType: input.mimeType,
    bytes: input.body.byteLength
  };
}

export async function createSignedViewUrl(input: { storageKey: string }) {
  const storage = assertStorageConfigured();

  return {
    ready: storage.ready,
    provider: storage.provider,
    storageKey: input.storageKey,
    viewUrl: storage.ready ? await getGeneratedImageUrl(input.storageKey) : null,
    nextAction: storage.ready ? "view" : "configure_s3"
  };
}

export async function deleteStoredObject(input: { storageKey: string }) {
  const storage = assertStorageConfigured();

  if (!storage.ready) {
    return {
      ready: false,
      provider: storage.provider,
      storageKey: input.storageKey,
      deleted: false,
      nextAction: "configure_s3"
    };
  }

  const deleted = await deleteGeneratedImage(input.storageKey);

  return {
    ready: true,
    provider: storage.provider,
    storageKey: input.storageKey,
    deleted,
    nextAction: deleted ? "deleted" : "delete_failed"
  };
}
