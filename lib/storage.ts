import { v2 as cloudinary } from "cloudinary";

export type StorageProvider = "s3_or_r2_or_cloudinary" | "s3" | "r2" | "cloudinary" | "local_placeholder";

const configuredProviders = new Set(["s3", "r2", "cloudinary"]);
const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
const maxImageSizeBytes = 8 * 1024 * 1024;

export function storageProvider(): StorageProvider {
  return (process.env.STORAGE_PROVIDER as StorageProvider) || "local_placeholder";
}

function cloudinaryConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || ""
  };
}

function isCloudinaryReady() {
  const config = cloudinaryConfig();
  return Boolean(config.cloudName && config.apiKey && config.apiSecret);
}

export function getAllowedImageTypes() {
  return [...allowedImageTypes];
}

export function getMaxImageSizeBytes() {
  return maxImageSizeBytes;
}

export function validateImageMetadata(input: { mimeType: string; sizeBytes: number }) {
  const allowedMimeTypes = getAllowedImageTypes();

  return {
    valid: allowedMimeTypes.includes(input.mimeType as any) && input.sizeBytes > 0 && input.sizeBytes <= maxImageSizeBytes,
    allowedMimeTypes,
    maxSizeBytes: maxImageSizeBytes
  };
}

export function assertStorageConfigured() {
  const provider = storageProvider();
  const ready = provider === "cloudinary" ? isCloudinaryReady() : configuredProviders.has(provider);

  return {
    provider,
    ready,
    message: ready ? "Image upload is configured." : "Image upload is not configured yet."
  };
}

export function createStorageKey(input: { userId: string; filename: string; purpose?: string }) {
  const safeFilename = input.filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  return `fitpick/${input.purpose || "wardrobe"}/${input.userId}/${Date.now()}-${crypto.randomUUID()}-${safeFilename || "upload"}`;
}

export function createWardrobeStorageKey(input: { userId: string; filename: string }) {
  return createStorageKey({ ...input, purpose: "wardrobe" });
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
  const config = cloudinaryConfig();
  const folder = `fitpick/wardrobe/${input.userId}`;
  const publicId = createStorageKey({ userId: input.userId, filename: input.filename, purpose: input.purpose }).split("/").pop() || crypto.randomUUID();
  const storageKey = `${folder}/${publicId}`;

  if (!validation.valid) {
    return {
      ready: false,
      provider: storage.provider,
      storageKey,
      maxSizeBytes: validation.maxSizeBytes,
      allowedMimeTypes: validation.allowedMimeTypes,
      message: "Choose a JPG, PNG, WebP, or HEIC image under 8 MB.",
      nextAction: "choose_supported_image"
    };
  }

  if (storage.provider !== "cloudinary" || !storage.ready) {
    return {
      ready: false,
      provider: storage.provider,
      storageKey,
      maxSizeBytes: validation.maxSizeBytes,
      allowedMimeTypes: validation.allowedMimeTypes,
      message: "Image upload is not configured yet.",
      nextAction: "configure_cloudinary"
    };
  }

  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = {
    folder,
    public_id: publicId,
    timestamp
  };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, config.apiSecret);

  return {
    ready: true,
    provider: storage.provider,
    storageKey,
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    signature,
    timestamp,
    apiKey: config.apiKey,
    cloudName: config.cloudName,
    folder,
    publicId,
    maxSizeBytes: validation.maxSizeBytes,
    allowedMimeTypes: validation.allowedMimeTypes,
    nextAction: "upload_to_cloudinary"
  };
}

export async function createSignedViewUrl(input: { storageKey: string }) {
  const storage = assertStorageConfigured();
  const config = cloudinaryConfig();

  if (storage.provider === "cloudinary" && storage.ready) {
    return {
      ready: true,
      provider: storage.provider,
      storageKey: input.storageKey,
      viewUrl: cloudinary.url(input.storageKey, {
        cloud_name: config.cloudName,
        secure: true,
        transformation: [{ quality: "auto", fetch_format: "auto" }]
      }),
      nextAction: "view"
    };
  }

  return {
    ready: false,
    provider: storage.provider,
    storageKey: input.storageKey,
    viewUrl: null,
    nextAction: "configure_cloudinary"
  };
}

export async function deleteStoredObject(input: { storageKey: string }) {
  const storage = assertStorageConfigured();
  const config = cloudinaryConfig();

  if (storage.provider === "cloudinary" && storage.ready) {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: true
    });

    await cloudinary.uploader.destroy(input.storageKey, { resource_type: "image" });

    return {
      ready: true,
      provider: storage.provider,
      storageKey: input.storageKey,
      deleted: true,
      nextAction: "deleted"
    };
  }

  return {
    ready: false,
    provider: storage.provider,
    storageKey: input.storageKey,
    deleted: false,
    nextAction: "configure_cloudinary"
  };
}
