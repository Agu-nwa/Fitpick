import "server-only";

import type { Types } from "mongoose";
import { PrivacyPreference } from "@/models/PrivacyPreference";

export const PHOTO_STORAGE_CONSENT_VERSION = "photo-storage-2026-08-25";
export const AI_PROCESSING_CONSENT_VERSION = "ai-processing-2026-08-25";

export async function hasPhotoStorageConsent(userId: string | Types.ObjectId) {
  const privacy = await PrivacyPreference.findOne({ userId })
    .select("photoStorageConsent photoStorageConsentVersion")
    .lean();
  return Boolean(
    privacy?.photoStorageConsent &&
    privacy.photoStorageConsentVersion === PHOTO_STORAGE_CONSENT_VERSION
  );
}

export async function hasAiProcessingConsent(userId: string | Types.ObjectId) {
  const privacy = await PrivacyPreference.findOne({ userId })
    .select("aiProcessingConsent aiProcessingConsentVersion")
    .lean();
  return Boolean(
    privacy?.aiProcessingConsent &&
    privacy.aiProcessingConsentVersion === AI_PROCESSING_CONSENT_VERSION
  );
}

export async function personalizationIsEnabled(userId: string | Types.ObjectId) {
  const privacy = await PrivacyPreference.findOne({ userId })
    .select("personalizedRecommendations")
    .lean();
  return privacy?.personalizedRecommendations !== false;
}

export async function outfitHistoryIsEnabled(userId: string | Types.ObjectId) {
  const privacy = await PrivacyPreference.findOne({ userId })
    .select("outfitHistoryEnabled")
    .lean();
  return privacy?.outfitHistoryEnabled !== false;
}
