export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { readJson, validateBody } from "@/lib/validation";
import { StylePreference } from "@/models/StylePreference";
import { PrivacyPreference } from "@/models/PrivacyPreference";
import { FashionMemory } from "@/models/FashionMemory";
import { OutfitHistory } from "@/models/OutfitHistory";
import { stylePreferenceSchema } from "@/schemas/preference.schema";
import {
  AI_PROCESSING_CONSENT_VERSION,
  PHOTO_STORAGE_CONSENT_VERSION
} from "@/lib/privacy/privacy-preferences";

export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const [preferences, privacy] = await Promise.all([
      (await StylePreference.findOne({ userId: auth.user._id }).lean()) ||
        (await StylePreference.create({ userId: auth.user._id })),
      (await PrivacyPreference.findOne({ userId: auth.user._id }).lean()) ||
        (await PrivacyPreference.create({ userId: auth.user._id }))
    ]);

    return apiSuccess({ preferences, privacy });
  } catch (error) {
    logSafeError("preferences.get", error);
    return apiError("INTERNAL_ERROR", "Unable to load preferences right now.");
  }
}

export async function PATCH(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `preferences:patch:${meta.ip}`, limit: 30, windowMs: 60 * 1000, operation: "preferences-patch" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const parsed = validateBody(stylePreferenceSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const {
      photoStorageConsent,
      aiProcessingConsent,
      personalizedRecommendations,
      outfitHistoryEnabled,
      marketingNotifications,
      ...styleData
    } = parsed.data;
    const now = new Date();
    const privacyData = {
      photoStorageConsent,
      aiProcessingConsent,
      personalizedRecommendations,
      outfitHistoryEnabled,
      marketingNotifications,
      ...(photoStorageConsent === true ? {
        photoStorageConsentAt: now,
        photoStorageConsentWithdrawnAt: null,
        photoStorageConsentVersion: PHOTO_STORAGE_CONSENT_VERSION
      } : {}),
      ...(photoStorageConsent === false ? {
        photoStorageConsentWithdrawnAt: now,
        photoStorageConsentVersion: ""
      } : {}),
      ...(aiProcessingConsent === true ? {
        aiProcessingConsentAt: now,
        aiProcessingConsentWithdrawnAt: null,
        aiProcessingConsentVersion: AI_PROCESSING_CONSENT_VERSION
      } : {}),
      ...(aiProcessingConsent === false ? {
        aiProcessingConsentWithdrawnAt: now,
        aiProcessingConsentVersion: ""
      } : {})
    };
    const cleanPrivacyData = Object.fromEntries(Object.entries(privacyData).filter(([, value]) => value !== undefined));

    const [preferences, privacy] = await Promise.all([
      StylePreference.findOneAndUpdate(
      { userId: auth.user._id },
        { $set: styleData },
      { new: true, upsert: true }
      ).lean(),
      Object.keys(cleanPrivacyData).length
        ? PrivacyPreference.findOneAndUpdate(
            { userId: auth.user._id },
            {
              $set: cleanPrivacyData,
              ...(aiProcessingConsent !== undefined ? {
                $push: {
                  aiConsentRecords: {
                    $each: [
                      { provider: "openai", purpose: "wardrobe_analysis", policyVersion: AI_PROCESSING_CONSENT_VERSION, granted: aiProcessingConsent, recordedAt: now },
                      { provider: "openai", purpose: "styling", policyVersion: AI_PROCESSING_CONSENT_VERSION, granted: aiProcessingConsent, recordedAt: now },
                      { provider: "openai", purpose: "preview_generation", policyVersion: AI_PROCESSING_CONSENT_VERSION, granted: aiProcessingConsent, recordedAt: now },
                      { provider: "openai", purpose: "voice_transcription", policyVersion: AI_PROCESSING_CONSENT_VERSION, granted: aiProcessingConsent, recordedAt: now },
                      { provider: "fashn", purpose: "virtual_tryon", policyVersion: AI_PROCESSING_CONSENT_VERSION, granted: aiProcessingConsent, recordedAt: now }
                    ],
                    $slice: -50
                  }
                }
              } : {})
            },
            { new: true, upsert: true }
          ).lean()
        : PrivacyPreference.findOne({ userId: auth.user._id }).lean()
    ]);

    const privacyCleanup: Promise<unknown>[] = [];
    if (personalizedRecommendations === false) {
      privacyCleanup.push(FashionMemory.updateMany(
        { userId: auth.user._id, revokedAt: null },
        { $set: { revokedAt: now } }
      ));
    }
    if (outfitHistoryEnabled === false) {
      privacyCleanup.push(OutfitHistory.deleteMany({ userId: auth.user._id }));
    }
    if (privacyCleanup.length) await Promise.all(privacyCleanup);

    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "preferences.update",
      entityType: "StylePreference",
      entityId: String(preferences?._id || "")
    });

    if (Object.keys(cleanPrivacyData).length) {
      await recordAuditEvent({
        request,
        userId: String(auth.user._id),
        action: "privacy.update",
        entityType: "PrivacyPreference",
        entityId: String(privacy?._id || "")
      });
    }

    return apiSuccess({ preferences, privacy }, { message: "Preferences updated." });
  } catch (error) {
    logSafeError("preferences.patch", error);
    return apiError("INTERNAL_ERROR", "Unable to update preferences right now.");
  }
}
