import assert from "node:assert/strict";
import fs from "node:fs";
import { decodeProtectedStorageKey, encodeProtectedStorageKey, getProtectedStorageUrl } from "../lib/storage/url";

function source(path: string) {
  return fs.readFileSync(new URL(path, import.meta.url), "utf8");
}

const preferenceModel = source("../models/PrivacyPreference.ts");
const preferenceRoute = source("../app/api/preferences/route.ts");
const privacyHelper = source("../lib/privacy/privacy-preferences.ts");
const protectedRoute = source("../app/api/uploads/[key]/content/route.ts");
const generatedStorage = source("../lib/storage/generated-images.ts");
const wardrobeSerializer = source("../lib/wardrobe.ts");
const outfitPreview = source("../lib/outfit-preview/outfit-preview.ts");
const avatarPreview = source("../lib/avatar/avatar-preview.ts");
const virtualTryOn = source("../lib/tryon/tryon-provider.ts");
const customTryOn = source("../lib/tryon/providers/dedicated-vton-tryon.ts");
const jobHandlers = source("../lib/jobs/handlers.ts");
const stylistChat = source("../app/api/stylist/chat/route.ts");
const referenceCreate = source("../app/api/stylist/reference-items/route.ts");
const signedUpload = source("../app/api/uploads/signed-url/route.ts");
const outfitPreviewRoute = source("../app/api/outfits/[id]/preview/route.ts");
const avatarPreviewRoute = source("../app/api/outfits/[id]/avatar-preview/route.ts");
const avatarProfile = source("../lib/avatar/avatar-profile.ts");
const fashionMemory = source("../lib/fashion-memory/fashion-memory.ts");
const outfitHistory = source("../lib/recommendation/history.ts");

assert.match(preferenceModel, /photoStorageConsentAt/, "photo-storage consent records when it was granted");
assert.match(preferenceModel, /aiProcessingConsentAt/, "AI consent records when it was granted");
assert.match(preferenceModel, /ConsentVersion/, "consent records a versioned disclosure");
assert.match(preferenceRoute, /ConsentWithdrawnAt/, "consent withdrawal is recorded");
assert.match(preferenceRoute, /FashionMemory\.updateMany/, "disabling personalization revokes learned memory");
assert.match(preferenceRoute, /OutfitHistory\.deleteMany/, "disabling history deletes stored outfit history");
assert.match(privacyHelper, /hasPhotoStorageConsent/, "photo consent has a centralized gate");
assert.match(privacyHelper, /hasAiProcessingConsent/, "AI consent has a centralized gate");

assert.match(signedUpload, /hasPhotoStorageConsent/, "new signed uploads require photo-storage consent");
assert.match(referenceCreate, /hasPhotoStorageConsent/, "reference photo records require photo-storage consent");
assert.match(jobHandlers, /hasAiProcessingConsent/, "wardrobe image analysis background work requires AI consent");
assert.match(stylistChat, /hasAiProcessingConsent/, "stylist requests require AI consent");
assert.match(outfitPreview, /hasAiProcessingConsent/, "outfit preview generation requires AI consent");
assert.match(avatarPreview, /hasAiProcessingConsent/, "avatar preview generation requires AI consent");
assert.match(outfitPreviewRoute, /hasAiProcessingConsent/, "synchronous outfit previews require AI consent before charging");
assert.match(avatarPreviewRoute, /hasAiProcessingConsent/, "Virtual Try-On routes require AI consent before reserving credits");
assert.match(virtualTryOn, /hasAiProcessingConsent/, "configured Virtual Try-On requires AI consent");

assert.match(protectedRoute, /requireUser\(\)/, "private image delivery authenticates the viewer");
assert.match(protectedRoute, /storageKeyBelongsToUser/, "private image delivery checks object ownership");
assert.match(protectedRoute, /private, no-store/, "private images cannot be cached as public content");
assert.match(generatedStorage, /studio-model\/catalog\//, "only the shared Studio Model catalogue remains public");
assert.match(generatedStorage, /getProtectedStorageUrl\(key\)/, "user generated images use protected URLs");
assert.match(wardrobeSerializer, /getProtectedStorageUrl/, "wardrobe serializers do not expose durable S3 URLs");
assert.match(avatarPreview, /createSignedViewUrl/, "AI image inputs receive short-lived signed links");
assert.match(customTryOn, /createSignedViewUrl/, "custom Virtual Try-On receives short-lived signed garment links");
assert.match(avatarProfile, /storageKeyBelongsToUser/, "model photo storage keys are restricted to the current user");

assert.match(fashionMemory, /personalizationIsEnabled/, "fashion-memory reads and writes enforce personalization choice");
assert.match(outfitHistory, /outfitHistoryIsEnabled/, "outfit-history reads and writes enforce history choice");

const protectedUrl = getProtectedStorageUrl("wardrobe/user-123/front image.webp");
assert.match(protectedUrl, /\/api\/uploads\/v1_[A-Za-z0-9_-]+\/content$/, "protected URLs remain same-origin and use a path-safe opaque storage-key token");
assert.doesNotMatch(protectedUrl, /amazonaws\.com|cloudfront\.net/, "protected URLs do not expose a durable storage origin");
assert.equal(decodeProtectedStorageKey(encodeProtectedStorageKey("wardrobe/user-123/name~one.webp")), "wardrobe/user-123/name~one.webp", "private route tokens round-trip unusual filenames safely");

console.log("Privacy and consent integrity tests passed.");
