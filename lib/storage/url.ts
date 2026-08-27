function cleanBaseUrl(value = "") {
  return value.trim().replace(/\/+$/, "");
}

function encodeStorageKey(storageKey: string) {
  return storageKey
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`))
    .join("/");
}

export function normalizeStorageKey(storageKey: string) {
  return storageKey
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/")
    .replace(/^\/+/, "")
    .slice(0, 512);
}

export function encodeProtectedStorageKey(storageKey: string) {
  const bytes = new TextEncoder().encode(normalizeStorageKey(storageKey));
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return `v1_${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

export function decodeProtectedStorageKey(token: string) {
  try {
    const value = String(token || "");
    if (!value.startsWith("v1_")) return normalizeStorageKey(decodeURIComponent(value));
    const base64 = value.slice(3).replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return normalizeStorageKey(new TextDecoder().decode(bytes));
  } catch {
    return "";
  }
}

export function s3PublicObjectUrl(input: { bucket?: string; region?: string; storageKey: string }) {
  const bucket = input.bucket || process.env.S3_BUCKET || process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || "";
  const region = input.region || process.env.S3_REGION || process.env.AWS_REGION || "";
  if (!bucket || !region) return "";
  const host = region === "us-east-1" ? `${bucket}.s3.amazonaws.com` : `${bucket}.s3.${region}.amazonaws.com`;
  return `https://${host}/${encodeStorageKey(normalizeStorageKey(input.storageKey))}`;
}

export function getPublicStorageUrl(storageKey: string) {
  const key = normalizeStorageKey(storageKey);
  const cloudFront =
    cleanBaseUrl(process.env.CLOUDFRONT_PUBLIC_URL) ||
    cleanBaseUrl(process.env.CLOUDFRONT_URL) ||
    cleanBaseUrl(process.env.NEXT_PUBLIC_CLOUDFRONT_URL) ||
    cleanBaseUrl(process.env.S3_PUBLIC_BASE_URL);

  if (cloudFront) return `${cloudFront}/${encodeStorageKey(key)}`;
  return s3PublicObjectUrl({ storageKey: key });
}

export function getProtectedStorageUrl(storageKey: string) {
  const key = normalizeStorageKey(storageKey);
  if (!key) return "";
  const baseUrl = cleanBaseUrl(
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://myfitpick.com"
  );
  return `${baseUrl}/api/uploads/${encodeProtectedStorageKey(key)}/content`;
}

export function redactSensitiveUrl(value = "") {
  if (!value) return "";
  try {
    const url = new URL(value);
    url.search = url.search ? "?[redacted]" : "";
    return url.toString();
  } catch {
    return value.replace(/\?.+$/, "?[redacted]");
  }
}
