import crypto from "crypto";
import { assertEnvReady } from "@/lib/config/env";
import { errorCategory, logAiEvent } from "@/lib/ai/observability/ai-logger";
import { resolveAwsCredentials, validateS3CredentialPair } from "@/lib/storage/aws-credentials";
import { getPublicStorageUrl, normalizeStorageKey, s3PublicObjectUrl } from "@/lib/storage/url";
import { assertGeneratedImageBuffer } from "@/lib/tryon/tryon-image-validation";

type UploadOptions = {
  userId: string;
  outfitId: string;
  cacheKey: string;
  storageKey?: string;
  contentType?: string;
  format?: "png" | "jpeg" | "webp";
  width?: number;
  height?: number;
};

export type UploadedGeneratedImage = {
  provider: "s3";
  storageKey: string;
  url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
};

const service = "s3";
const allowedGeneratedFormats = new Set(["png", "jpeg", "webp"]);
const allowedGeneratedContentTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

function s3Config() {
  return {
    bucket: process.env.S3_BUCKET || process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || "",
    region: process.env.S3_REGION || process.env.AWS_REGION || "",
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || process.env.CLOUDFRONT_PUBLIC_URL || process.env.CLOUDFRONT_GENERATED_IMAGES_URL || process.env.CLOUDFRONT_URL || process.env.NEXT_PUBLIC_CLOUDFRONT_URL || ""
  };
}

function hmac(key: Buffer | string, value: string) {
  return crypto.createHmac("sha256", key).update(value).digest();
}

function hash(value: Buffer | string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function amzDate(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function dateStamp(amz: string) {
  return amz.slice(0, 8);
}

function encodePathPart(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function objectUrl(bucket: string, region: string, key: string) {
  return s3PublicObjectUrl({ bucket, region, storageKey: key });
}

function signingKey(secret: string, stamp: string, region: string) {
  const kDate = hmac(`AWS4${secret}`, stamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

function bufferFromImage(input: Buffer | string) {
  if (Buffer.isBuffer(input)) return input;
  const base64 = input.includes(",") ? input.split(",").pop() || "" : input;
  return Buffer.from(base64, "base64");
}

function makeStorageKey(options: UploadOptions) {
  const format = options.format || "png";
  if (!allowedGeneratedFormats.has(format)) throw new Error("Unsupported generated image format.");
  if (options.storageKey) return normalizeStorageKey(options.storageKey);
  const hashPart = crypto.createHash("sha256").update(options.cacheKey).digest("hex").slice(0, 24);
  return normalizeStorageKey(`generated-previews/${options.userId}/${options.outfitId}/${hashPart}.${format}`);
}

function assertReady() {
  assertEnvReady({ strict: process.env.NODE_ENV === "production" });
  validateS3CredentialPair();
  const config = s3Config();
  if (!config.bucket || !config.region) {
    throw new Error("S3 generated image storage is not configured.");
  }
  return config;
}

export async function uploadGeneratedImage(bufferOrBase64: Buffer | string, options: UploadOptions): Promise<UploadedGeneratedImage> {
  const startedAt = Date.now();
  const config = assertReady();
  const credentials = await resolveAwsCredentials();
  const body = bufferFromImage(bufferOrBase64);
  const detected = assertGeneratedImageBuffer(body, options.contentType || `image/${options.format || "png"}`);
  const contentType = detected.contentType;
  const format = detected.format;
  if (!allowedGeneratedContentTypes.has(contentType)) throw new Error("Unsupported generated image content type.");
  const storageKey = makeStorageKey({ ...options, format });
  const host = config.region === "us-east-1" ? `${config.bucket}.s3.amazonaws.com` : `${config.bucket}.s3.${config.region}.amazonaws.com`;
  const now = amzDate();
  const stamp = dateStamp(now);
  const payloadHash = hash(body);
  const canonicalUri = `/${storageKey.split("/").map(encodePathPart).join("/")}`;
  const tokenHeader = credentials.sessionToken ? `x-amz-security-token:${credentials.sessionToken}\n` : "";
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${now}\n${tokenHeader}`;
  const signedHeaders = credentials.sessionToken
    ? "content-type;host;x-amz-content-sha256;x-amz-date;x-amz-security-token"
    : "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${stamp}/${config.region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", now, scope, hash(canonicalRequest)].join("\n");
  const signature = crypto.createHmac("sha256", signingKey(credentials.secretAccessKey, stamp, config.region)).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const url = objectUrl(config.bucket, config.region, storageKey);
  const headers: Record<string, string> = {
    authorization,
    "content-type": contentType,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": now
  };
  if (credentials.sessionToken) headers["x-amz-security-token"] = credentials.sessionToken;

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: body as unknown as BodyInit
    });

    if (!response.ok) {
      throw new Error(`S3 upload failed with status ${response.status}.`);
    }
  } catch (error) {
    logAiEvent({
      operation: "storage-upload",
      model: "system",
      latencyMs: Date.now() - startedAt,
      status: "failed",
      provider: "s3",
      bytes: body.byteLength,
      errorCategory: errorCategory(error)
    });
    throw error;
  }

  logAiEvent({
    operation: "storage-upload",
    model: "system",
    latencyMs: Date.now() - startedAt,
    status: "success",
    provider: "s3",
    bytes: body.byteLength
  });

  const publicUrl = await getGeneratedImageUrl(storageKey);
  if (!/^https:\/\//i.test(publicUrl)) throw new Error("Generated image public URL is invalid.");

  return {
    provider: "s3",
    storageKey,
    url: publicUrl,
    format,
    width: options.width || 1024,
    height: options.height || 1024,
    bytes: body.byteLength
  };
}

export async function uploadGeneratedImageFromUrl(url: string, options: UploadOptions): Promise<UploadedGeneratedImage> {
  const safeUrl = String(url || "").trim();
  if (!/^https:\/\//i.test(safeUrl)) throw new Error("Generated image URL must be HTTPS.");

  const response = await fetch(safeUrl, {
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`Generated image download failed with status ${response.status}.`);

  const declaredContentType = response.headers.get("content-type") || "";
  if (declaredContentType && /text\/html|application\/json|text\/plain/i.test(declaredContentType)) {
    throw new Error("Generated image URL returned a non-image response.");
  }

  const body = Buffer.from(await response.arrayBuffer());
  const detected = assertGeneratedImageBuffer(body, declaredContentType);
  return uploadGeneratedImage(body, {
    ...options,
    contentType: detected.contentType,
    format: detected.format
  });
}

export async function getGeneratedImageUrl(storageKey: string) {
  return getPublicStorageUrl(storageKey);
}

export async function deleteGeneratedImage(storageKey: string) {
  const config = assertReady();
  const credentials = await resolveAwsCredentials();
  const host = config.region === "us-east-1" ? `${config.bucket}.s3.amazonaws.com` : `${config.bucket}.s3.${config.region}.amazonaws.com`;
  const now = amzDate();
  const stamp = dateStamp(now);
  const payloadHash = hash("");
  const canonicalUri = `/${normalizeStorageKey(storageKey).split("/").map(encodePathPart).join("/")}`;
  const tokenHeader = credentials.sessionToken ? `x-amz-security-token:${credentials.sessionToken}\n` : "";
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${now}\n${tokenHeader}`;
  const signedHeaders = credentials.sessionToken
    ? "host;x-amz-content-sha256;x-amz-date;x-amz-security-token"
    : "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["DELETE", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${stamp}/${config.region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", now, scope, hash(canonicalRequest)].join("\n");
  const signature = crypto.createHmac("sha256", signingKey(credentials.secretAccessKey, stamp, config.region)).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const headers: Record<string, string> = {
    authorization,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": now
  };
  if (credentials.sessionToken) headers["x-amz-security-token"] = credentials.sessionToken;

  const response = await fetch(objectUrl(config.bucket, config.region, storageKey), {
    method: "DELETE",
    headers
  });

  return response.ok || response.status === 404;
}
