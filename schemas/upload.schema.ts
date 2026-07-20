import { z } from "zod";
import { DEFAULT_ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES, imageUploadRequirementText } from "@/lib/upload-limits";

export const allowedUploadMimeTypes = DEFAULT_ALLOWED_IMAGE_MIME_TYPES;

export const uploadPurposeSchema = z
  .enum([
    "wardrobe_original",
    "wardrobe_thumbnail",
    "wardrobe_front",
    "wardrobe_back",
    "wardrobe_fabricCloseUp",
    "wardrobe_label",
    "avatar",
    "avatar_model"
  ]);

export const signedUploadSchema = z.object({
  filename: z.string().trim().min(1).max(180),
  mimeType: z.enum(allowedUploadMimeTypes),
  sizeBytes: z.number().int().positive().max(MAX_IMAGE_UPLOAD_BYTES, imageUploadRequirementText()),
  purpose: uploadPurposeSchema.default("wardrobe_original")
});
