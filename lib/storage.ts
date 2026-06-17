export type StorageProvider = "s3_or_r2_or_cloudinary" | "s3" | "r2" | "cloudinary";

export function storageProvider(): StorageProvider {
  return (process.env.STORAGE_PROVIDER as StorageProvider) || "s3_or_r2_or_cloudinary";
}

export function assertStorageConfigured() {
  return {
    provider: storageProvider(),
    ready: false,
    message: "Private wardrobe image storage is scaffolded for a later phase."
  };
}
