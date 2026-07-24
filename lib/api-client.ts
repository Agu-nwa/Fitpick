import type { ApiFailure, ApiResponse } from "@/types/api";
import type { AiSuggestedWardrobeTags, WardrobeImageAsset } from "@/types/ai-tagging";
import type { WardrobeAiAnalysis } from "@/lib/ai/schemas/wardrobe-ai.schema";
import { safeApiFailure } from "@/lib/user-facing-errors";
import type { Occasion } from "@/types/occasion";
import type { FitLockSummary, OutfitRecommendation, PreviewAccuracySummary, ReferenceFashionItemSummary, StylistAvatarPreview, StylistResponse, StylistVisualMode } from "@/types/outfit";
import type { WardrobeItem, WardrobeSummary } from "@/types/wardrobe";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

const backendUnavailable: ApiFailure = {
  ok: false,
  error: {
    code: "INTERNAL_ERROR",
    message: "MyFitPick services are not reachable right now. Please try again shortly."
  }
};

const invalidResponse: ApiFailure = {
  ok: false,
  error: {
    code: "INTERNAL_ERROR",
    message: "MyFitPick received an unexpected response. Please try again."
  }
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(path, {
      ...options,
      headers: {
        ...(options.body === undefined ? {} : { "content-type": "application/json" }),
        ...(options.headers || {})
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "include"
    });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return invalidResponse;

    const payload = (await response.json()) as ApiResponse<T>;
    if (payload && typeof payload === "object" && "ok" in payload) {
      return payload.ok ? payload : safeApiFailure(payload);
    }

    return invalidResponse;
  } catch {
    return backendUnavailable;
  }
}

export type BackendHealth = {
  ok?: boolean;
  service: string;
  version?: string;
  status: string;
  databaseConfigured: boolean;
  timestamp: string;
  time?: string;
  checks?: {
    app: "ok" | "skipped" | "degraded" | "not_checked" | string;
    database: "ok" | "skipped" | "degraded" | "not_checked" | string;
    storage: "ok" | "skipped" | "degraded" | "not_checked" | string;
    worker: "ok" | "skipped" | "degraded" | "not_checked" | string;
    queue?: "ok" | "skipped" | "degraded" | "not_checked" | string;
  };
  queue?: {
    byStatus: Record<string, number>;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    deadLetter: number;
    oldestQueueWaitMs: number;
    latestHeartbeatMsAgo: number | null;
  } | null;
};

export type CurrentUserSummary = {
  user?: {
    id: string;
    name: string;
    email: string;
    role: "user" | "admin";
    credits?: number;
    totalCreditsPurchased?: number;
    totalCreditsRefunded?: number;
    totalCreditsSpent?: number;
    complimentaryCreditsUsed?: number;
    modelSetupCompletedAt?: string;
    weatherLocationName?: string;
    weatherCountryCode?: string;
    weatherCountryName?: string;
    weatherCityName?: string;
    weatherLatitude?: number;
    weatherLongitude?: number;
    weatherTimezone?: string;
    weatherLocationUpdatedAt?: string;
  };
  wallet?: CreditWalletSummary;
};

export type AuthOtpPurpose = "signup" | "signin";

export type RequestOtpData = {
  email: string;
  purpose: AuthOtpPurpose;
  expiresAt: string;
  expiresInMinutes: number;
};

export type VerifyOtpData = {
  user: CurrentUserSummary["user"];
};

export type AccountDeletionRequestData = {
  deletionRequested: boolean;
  requestedAt?: string;
};

export type WardrobeListData = {
  items: WardrobeItem[];
  summary: WardrobeSummary;
};

export type WardrobeItemData = {
  item: WardrobeItem;
};

export type WardrobeArchiveData = {
  item?: WardrobeItem;
  archived?: boolean;
  deleted?: boolean;
};

export type WardrobeUploadRecord = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  uploadStatus: string;
  aiTagStatus: string;
  aiProvider?: string;
  aiConfidence?: number;
  aiErrorSafeMessage?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  selectedCategory?: WardrobeItem["category"] | "";
  selectedCategoryLabel?: string;
  intakeCategoryId?: string;
  intakeGroup?: string;
  userInputMetadata?: Record<string, unknown>;
  categorySpecificMetadata?: Record<string, unknown>;
  ocrMetadata?: Record<string, unknown>;
  labelPhotoKinds?: string[];
  recommendationMetadata?: Record<string, unknown>;
  virtualTryOnMetadata?: Record<string, unknown>;
  searchMetadata?: Record<string, unknown>;
  enrichmentStatus?: "not_started" | "queued" | "completed" | "failed" | string;
  images?: {
    front?: WardrobeImageAsset;
    back?: WardrobeImageAsset;
    fabricCloseUp?: WardrobeImageAsset;
    label?: WardrobeImageAsset;
    additional?: WardrobeImageAsset[];
  };
  aiAnalysis?: WardrobeAiAnalysis | null;
  suggestedTags: Record<string, unknown>;
  taggedSize?: WardrobeItem["taggedSize"];
  sizeSystem?: WardrobeItem["sizeSystem"];
  garmentFit?: WardrobeItem["garmentFit"];
  garmentMeasurements?: WardrobeItem["garmentMeasurements"];
  stretchLevel?: WardrobeItem["stretchLevel"];
  fabricDrape?: WardrobeItem["fabricDrape"];
  fitConfidence?: number;
  measurementSource?: WardrobeItem["measurementSource"];
  reviewedAt: string | null;
  createdItemId: string | null;
};

export type SignedUploadData = {
  upload: {
    ready: boolean;
    provider: string;
    storageKey: string;
    uploadUrl?: string;
    method?: string;
    headers?: Record<string, string>;
    publicUrl?: string;
    signature?: string;
    timestamp?: number;
    apiKey?: string;
    cloudName?: string;
    folder?: string;
    publicId?: string;
    maxSizeBytes: number;
    allowedMimeTypes: string[];
    message?: string;
    nextAction: string;
  };
};

export type ServerUploadData = {
  upload: {
    ready: true;
    provider: string;
    storageKey: string;
    publicUrl: string;
    filename?: string;
    mimeType?: string;
    sizeBytes?: number;
    width?: number;
    height?: number;
    normalized?: {
      originalMimeType?: string;
      detectedMimeType?: string;
      detectedFormat?: string;
      originalSizeBytes?: number;
      originalWidth?: number;
      originalHeight?: number;
      outputMimeType?: string;
      outputSizeBytes?: number;
      warnings?: string[];
    };
    maxSizeBytes: number;
    allowedMimeTypes: string[];
    nextAction: string;
  };
};

export type WardrobeUploadData = {
  upload: WardrobeUploadRecord;
  storage?: {
    provider: string;
    ready: boolean;
    mode: string;
  };
  nextAction?: string;
};

export type WardrobeUploadDetailData = {
  upload: WardrobeUploadRecord;
};

export type WardrobeUploadReviewData = {
  item: WardrobeItem;
  upload: WardrobeUploadRecord;
  nextAction?: string;
};

export type WardrobeTagSuggestionData = {
  uploadId: string;
  aiTagStatus: string;
  suggestedTags: AiSuggestedWardrobeTags;
  aiAnalysis?: WardrobeAiAnalysis | null;
  safeMessage?: string;
  job?: JobStatusData["job"];
};

export type OccasionsData = {
  occasions: Occasion[];
};

export type OccasionData = {
  occasion: Occasion;
};

export type OutfitData = {
  outfit: OutfitRecommendation;
};

export type OutfitPreviewData = {
  preview: {
    id: string;
    status: "not_started" | "generating" | "ready" | "failed" | string;
    provider: string;
    storageKey: string;
    imageUrl: string;
    previewUrl: string;
    cacheKey: string;
    promptVersion: string;
    model: string;
    accuracyLevel?: PreviewAccuracySummary;
    fitWarnings?: string[];
    generatedAt: string | null;
    errorMessage: string;
    attempts: number;
    cached: boolean;
    visualizationNote: string;
  };
  job?: JobStatusData["job"];
};

export type JobStatusData = {
  job: {
    id: string;
    type: string;
    status: "queued" | "processing" | "completed" | "failed" | "cancelled" | "dead_letter";
    attempts: number;
    maxAttempts: number;
    result: Record<string, any>;
    errorMessage: string;
    claimedBy?: string;
    queueWaitMs?: number;
    processingDurationMs?: number;
    availableAt: string | null;
    startedAt: string | null;
    lockedAt?: string | null;
    lockExpiresAt?: string | null;
    lastHeartbeatAt?: string | null;
    completedAt: string | null;
    failedAt: string | null;
    deadLetteredAt?: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
};

export type TryOnGenerationSummary = {
  generationId: string;
  idempotencyKey: string;
  outfitId: string;
  avatarProfileId: string;
  previewId: string | null;
  provider: string;
  providerJobId: string;
  status: string;
  failureStage: string;
  failureCode: string;
  failureMessage: string;
  previewUrl: string;
  storageKey: string;
  creditsReserved: number;
  creditsCommitted: number;
  creditsReleased: number;
  retryCount: number;
  durationMs: number;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string | null;
};

export type PreferencesData = {
  preferences: Record<string, any>;
  privacy?: Record<string, any>;
};

export type NotificationPreferencesData = {
  preferences: {
    morningReminder: boolean;
    weatherAlerts: boolean;
    eventPrep: boolean;
    repeatWarnings: boolean;
    pushTokenExists?: boolean;
    quietHours?: { enabled?: boolean; start?: string; end?: string };
    timezone?: string;
  };
};

export type StyleProfileData = {
  profile: {
    id: string;
    favoriteColors: string[];
    dislikedColors: string[];
    favoriteBrands: string[];
    dislikedBrands: string[];
    preferredFits: string[];
    dislikedFits: string[];
    preferredFormality: number | null;
    preferredOccasions: string[];
    eventStylePreferences: string[];
    preferredCategories: string[];
    avoidedCategories: string[];
    fashionRiskLevel: "conservative" | "balanced" | "expressive";
    comfortPriority: "low" | "medium" | "high";
    luxuryPreference: "low" | "medium" | "high";
    notes: string[];
    inferredFrom: string[];
    createdAt: string | null;
    updatedAt: string | null;
  };
};

export type AvatarProfileData = {
  profile: {
    id: string;
    genderPresentation: "masculine" | "feminine" | "neutral";
    bodyPreset: "slim" | "average" | "athletic" | "curvy" | "plus";
    heightPreset: "short" | "average" | "tall" | null;
    skinTonePreset: string | null;
    hairStylePreset: string | null;
    posePreset: "standing" | "walking" | "editorial" | "runway" | "casual" | "side" | "back";
    visualizationStyle: "minimal" | "luxury" | "streetwear" | "editorial";
    avatarProvider: "ready_player_me" | "fitpick_preset" | "custom_glb";
    avatarUrl: string | null;
    glbStorageKey: string | null;
    tryOnModelSource: "none" | "uploaded" | "generated";
    uploadedModelImageUrl: string | null;
    uploadedModelImageStorageKey: string | null;
    generatedModelImageUrl: string | null;
    generatedModelImageStorageKey: string | null;
    generatedModelPromptVersion: string;
    generatedModelAt: string | null;
    heightCm: number | null;
    weightKg: number | null;
    chestCm: number | null;
    bustCm: number | null;
    waistCm: number | null;
    hipsCm: number | null;
    shoulderWidthCm: number | null;
    inseamCm: number | null;
    armLengthCm: number | null;
    neckCm: number | null;
    thighCm: number | null;
    shoeSize: string;
    bodyMeasurementSource: "manual" | "estimated" | "body_scan" | "unknown";
    bodyMeasurementConfidence: number;
    bodyFitPreference: "true_to_size" | "slim" | "regular" | "relaxed" | "oversized";
    consentAccepted: boolean;
    createdAt: string | null;
    updatedAt: string | null;
  };
};

export type AvatarPreviewData = {
  preview: {
    id: string;
    status: "not_started" | "generating" | "ready" | "failed" | string;
    provider: "s3" | string;
    storageKey: string;
    imageUrl: string;
    previewUrl: string;
    cacheKey: string;
    generationId?: string;
    billingStatus?: string;
    promptVersion: string;
    model: string;
    visualizationStyle: "minimal" | "luxury" | "streetwear" | "editorial" | string;
    posePreset: "standing" | "walking" | "editorial" | "runway" | "casual" | "side" | "back" | string;
    accuracyLevel?: PreviewAccuracySummary;
    fitStatus?: string;
    fitConfidence?: number;
    fitWarnings?: string[];
    fitLockInstructions?: string[];
    groundedItemIds?: string[];
    missingVisualItemIds?: string[];
    visualizationWarnings?: string[];
    footwearIncluded?: boolean;
    visualGroundingStatus?: string;
    progressiveTrigger?: StylistAvatarPreview["progressiveTrigger"];
    setupPath?: string | null;
    generatedAt: string | null;
    errorMessage: string;
    attempts: number;
    cached: boolean;
    visualizationNote: string;
  };
  avatarProfile?: AvatarProfileData["profile"];
  generation?: TryOnGenerationSummary | null;
  job?: JobStatusData["job"];
};

export type StylistChatData = {
  reply: string;
  stylist: StylistResponse;
  referenceItem?: ReferenceFashionItemSummary | null;
  referenceRecommendations?: OutfitRecommendation[];
  referenceSelectionRequired?: boolean;
  outfitRecommendationId: string | null;
  avatarPreview: StylistAvatarPreview;
  visualization: {
    visualMode: StylistVisualMode;
    outfitRecommendationId: string | null;
    avatarPreview: StylistAvatarPreview;
    visualizationDisclaimer: string;
    fitLock?: FitLockSummary;
    job?: JobStatusData["job"];
  };
  outfit: OutfitRecommendation | null;
  job?: JobStatusData["job"];
  groundedItemCount: number;
};

export type SendStylistMessageOptions = {
  allowShoppingAdvice?: boolean;
  includeVisualization?: boolean;
  visualMode?: StylistVisualMode;
  referenceItemId?: string | null;
  recentMessages?: Array<{ role: "user" | "assistant"; content: string }>;
};

export type ReferenceFashionItemData = {
  referenceItem: ReferenceFashionItemSummary | null;
  safeMessage?: string;
};

export type ReferenceRecommendationsData = {
  referenceItem: ReferenceFashionItemSummary | null;
  recommendations: OutfitRecommendation[];
};

export type ReferenceAddToClosetData = {
  referenceItem: ReferenceFashionItemSummary | null;
  upload: WardrobeUploadRecord;
  nextAction: string;
};

export type FashionMemorySummary = {
  eventCount: number;
  positive: {
    itemIds: string[];
    colors: string[];
    categories: string[];
    brands: string[];
    fits: string[];
  };
  negative: {
    itemIds: string[];
    colors: string[];
    categories: string[];
    brands: string[];
    fits: string[];
  };
  recentlyWornItemIds: string[];
  savedItemIds: string[];
  occasions: string[];
  eventContext: string[];
  season: string[];
  weather: string[];
  lastEventAt: string | null;
};

export type FashionMemoryData = {
  summary: FashionMemorySummary;
  memory?: {
    id: string;
    type: string;
    createdAt: string | null;
  };
};

export type CreditWalletSummary = {
  balance: number;
  totalCreditsPurchased: number;
  totalCreditsRefunded: number;
  totalCreditsSpent: number;
  complimentaryCreditsUsed: number;
  complimentaryCreditsRemaining: number;
  purchasedCreditsRemaining: number;
};

export type CreditTransactionSummary = {
  id: string;
  feature: string;
  credits: number;
  status: "pending" | "processing" | "spent" | "credited" | "reversed" | "failed" | "refunded" | string;
  referenceId: string;
  balanceAfter: number | null;
  createdAt: string | null;
};

export type CreditPackSummary = {
  id: string;
  label: string;
  credits: number;
  amountMinor: number;
  currency: "USD";
  amountLabel: string;
  status: "available";
};

export type CreditPurchaseSummary = {
  id: string;
  packId: string;
  packName: string;
  credits: number;
  amountMinor: number;
  amountLabel: string;
  currency: "USD";
  provider: "stripe" | "coinpayments";
  paymentMethod: "fiat" | "usdt";
  status: string;
  createdAt: string | null;
  paidAt: string | null;
  creditedAt: string | null;
  refundedAt: string | null;
  checkoutUrl?: string | null;
  usdtNetwork?: string | null;
  expectedUsdtAmount?: string | null;
  receivedUsdtAmount?: string | null;
  confirmations?: number | null;
  requiredConfirmations?: number | null;
};

export type UsdtNetworkSummary = {
  id: string;
  displayName: string;
  asset: "USDT";
  network: string;
  estimatedFee?: string;
  availability: "available" | "unavailable";
};

export type CreditWalletData = {
  wallet: CreditWalletSummary;
  transactions: CreditTransactionSummary[];
  usageHistory: CreditTransactionSummary[];
  costs: Array<{ feature: string; label: string; credits: number; description: string }>;
  freeFeatures: string[];
  packs: CreditPackSummary[];
  purchases: CreditPurchaseSummary[];
  paymentsReady: boolean;
  providers: Record<string, { configured: boolean; currencies: string[]; paymentMethods: string[]; message?: string }>;
  usdtNetworks: UsdtNetworkSummary[];
};

export type WeatherForecastData = {
  status: "ready" | "location_needed" | "unavailable" | string;
  forecast: null | {
    location: {
      name: string;
      latitude?: number;
      longitude?: number;
    };
    current: {
      temperature: number;
      feelsLike?: number;
      high?: number;
      low?: number;
      rainChance?: number;
      humidity: number;
      windKph?: number;
      uvIndex?: number | null;
      condition: string;
      city?: string;
      country?: string;
      stylingAdvice?: string;
    };
    days: Array<{
      date: string;
      label: string;
      temperature: number;
      feelsLike?: number;
      high?: number;
      low?: number;
      rainChance?: number;
      humidity: number;
      windKph?: number;
      uvIndex?: number | null;
      condition: string;
      stylingAdvice?: string;
    }>;
    summary: string;
    cached: boolean;
    provider: string;
    fetchedAt: string;
  };
  safeMessage: string;
};

export type LocationCountry = {
  code: string;
  name: string;
};

export type LocationCity = {
  id: string;
  countryCode: string;
  countryName: string;
  cityName: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type LocationCountriesData = {
  countries: LocationCountry[];
};

export type LocationCitiesData = {
  country: LocationCountry;
  query: string;
  cities: LocationCity[];
};

export type WeatherLocationUpdateData = {
  user: CurrentUserSummary["user"];
  location: LocationCity;
};

export type CheckoutData = {
  checkout: {
    ready: boolean;
    checkoutUrl?: string | null;
    purchaseId?: string;
    invoiceId?: string;
    paymentMethod?: "fiat" | "usdt";
    network?: UsdtNetworkSummary;
    warning?: string;
    currency?: string;
    provider?: "stripe" | "coinpayments";
    message?: string;
    nextAction?: string;
  };
};

export type PaymentProvidersData = {
  paymentsReady: boolean;
  providers: Record<string, { configured: boolean; currencies: string[]; paymentMethods: string[]; message?: string }>;
  packs: CreditPackSummary[];
  usdtNetworks: UsdtNetworkSummary[];
};

export type PaymentPurchaseData = {
  purchase: CreditPurchaseSummary;
};

export type PaymentPurchasesData = {
  purchases: CreditPurchaseSummary[];
};

export type AdminAuditData = {
  recent: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId?: string;
    createdAt?: string;
  }>;
  summary: Array<{ action: string; count: number }>;
};

export type AdminContentData = {
  contentRuleSummary: Array<{ type: string; count: number }>;
  occasions: Array<{
    id: string;
    name: string;
    group: string;
    formality: string;
  }>;
};

export type AdminSeedData = {
  occasions: number;
  reasonChips: number;
  contentRules: number;
};

export const getBackendHealth = () => apiRequest<BackendHealth>("/api/health", { cache: "no-store" });
export const getCurrentUser = () => apiRequest<CurrentUserSummary>("/api/auth/me", { cache: "no-store" });
export const getAdminAudit = () => apiRequest<AdminAuditData>("/api/admin/audit", { cache: "no-store" });
export const getAdminContent = () => apiRequest<AdminContentData>("/api/admin/content", { cache: "no-store" });
export const runAdminSeed = () => apiRequest<AdminSeedData>("/api/admin/seed", { method: "POST" });
export const requestAuthOtp = (body: { email: string; purpose: AuthOtpPurpose }) =>
  apiRequest<RequestOtpData>("/api/auth/request-otp", { method: "POST", body });
export const verifyAuthOtp = (body: { email: string; code: string; purpose: AuthOtpPurpose; name?: string }) =>
  apiRequest<VerifyOtpData>("/api/auth/verify-otp", { method: "POST", body });
export const register = (body: unknown) => apiRequest("/api/auth/register", { method: "POST", body });
export const login = (body: unknown) => apiRequest("/api/auth/login", { method: "POST", body });
export const logout = () => apiRequest("/api/auth/logout", { method: "POST" });
export const requestAccountDeletion = (body: { reason?: string } = {}) =>
  apiRequest<AccountDeletionRequestData>("/api/users/me/delete-request", { method: "POST", body });
export const getPreferences = () => apiRequest<PreferencesData>("/api/preferences", { cache: "no-store" });
export const updatePreferences = (body: unknown) => apiRequest<PreferencesData>("/api/preferences", { method: "PATCH", body });
export const getOccasions = () => apiRequest<OccasionsData>("/api/occasions", { cache: "no-store" });
export const createCustomOccasion = (body: unknown) => apiRequest<OccasionData>("/api/occasions/custom", { method: "POST", body });
export const getWardrobe = () => apiRequest<WardrobeListData>("/api/wardrobe", { cache: "no-store" });
export const createWardrobeItem = (body: unknown) => apiRequest<WardrobeItemData>("/api/wardrobe", { method: "POST", body });
export const getWardrobeItem = (id: string) => apiRequest<WardrobeItemData>(`/api/wardrobe/${id}`, { cache: "no-store" });
export const updateWardrobeItem = (id: string, body: unknown) =>
  apiRequest<WardrobeItemData>(`/api/wardrobe/${id}`, { method: "PATCH", body });
export const updateWardrobeTags = (id: string, body: unknown) =>
  apiRequest<WardrobeItemData>(`/api/wardrobe/${id}/tags`, { method: "PATCH", body });
export const archiveWardrobeItem = (id: string) =>
  apiRequest<WardrobeArchiveData>(`/api/wardrobe/${id}`, { method: "DELETE" });
export const uploadWardrobeMetadata = (body: unknown) => apiRequest<WardrobeUploadData>("/api/wardrobe/upload", { method: "POST", body });
export const getWardrobeUpload = (uploadId: string) =>
  apiRequest<WardrobeUploadDetailData>(`/api/wardrobe/upload/${uploadId}`, { cache: "no-store" });
export const reviewWardrobeUploadTags = (uploadId: string, body: unknown) =>
  apiRequest<WardrobeUploadReviewData>(`/api/wardrobe/upload/${uploadId}/review-tags`, { method: "POST", body });
export const suggestWardrobeUploadTags = (uploadId: string) =>
  apiRequest<WardrobeTagSuggestionData>(`/api/wardrobe/upload/${uploadId}/suggest-tags`, { method: "POST" });
export const analyzeWardrobeUpload = (uploadId: string) =>
  apiRequest<WardrobeTagSuggestionData>(`/api/wardrobe/upload/${uploadId}/analyze`, { method: "POST" });
export const confirmWardrobeUploadTags = (uploadId: string, body: unknown) =>
  apiRequest<WardrobeUploadReviewData>(`/api/wardrobe/upload/${uploadId}/confirm-tags`, { method: "POST", body });
export const createRecommendation = (body: unknown) => apiRequest<OutfitData>("/api/outfits/recommend", { method: "POST", body });
export const getOutfit = (id: string) => apiRequest<OutfitData>(`/api/outfits/${id}`, { cache: "no-store" });
export const swapOutfitItem = (id: string, body: unknown) => apiRequest<OutfitData>(`/api/outfits/${id}/swap`, { method: "POST", body });
export const getOutfitPreview = (id: string) => apiRequest<OutfitPreviewData>(`/api/outfits/${id}/preview`, { cache: "no-store" });
export const generateOutfitPreview = (id: string, options: unknown = {}) =>
  apiRequest<OutfitPreviewData>(`/api/outfits/${id}/preview`, { method: "POST", body: options });
export const getJobStatus = (id: string) => apiRequest<JobStatusData>(`/api/jobs/${id}`, { cache: "no-store" });
export const saveOutfit = (id: string, body: unknown) => apiRequest(`/api/outfits/${id}/save`, { method: "POST", body });
export const wearOutfit = (id: string, body: unknown) => apiRequest(`/api/outfits/${id}/wear`, { method: "POST", body });
export const submitOutfitFeedback = (id: string, body: unknown) => apiRequest(`/api/outfits/${id}/feedback`, { method: "POST", body });
export const getFashionMemorySummary = () => apiRequest<FashionMemoryData>("/api/fashion-memory", { cache: "no-store" });
export const recordFashionMemory = (event: unknown) => apiRequest<FashionMemoryData>("/api/fashion-memory", { method: "POST", body: event });
export const getWallet = () => apiRequest<CreditWalletData>("/api/wallet", { cache: "no-store" });
export const getPaymentProviders = () => apiRequest<PaymentProvidersData>("/api/payments/providers", { cache: "no-store" });
export const getPaymentPurchases = () => apiRequest<PaymentPurchasesData>("/api/payments/purchases", { cache: "no-store" });
export const getPaymentPurchase = (purchaseId: string) => apiRequest<PaymentPurchaseData>(`/api/payments/purchases/${purchaseId}`, { cache: "no-store" });
export const getUsdtNetworks = () => apiRequest<{ networks: UsdtNetworkSummary[] }>("/api/payments/usdt/networks", { cache: "no-store" });
export const startStripeCheckout = (body: { packId: string }) => apiRequest<CheckoutData>("/api/payments/stripe/checkout", { method: "POST", body });
export const startUsdtCheckout = (body: { packId: string; network: string }) => apiRequest<CheckoutData>("/api/payments/usdt/checkout", { method: "POST", body });
export const getLocationCountries = () => apiRequest<LocationCountriesData>("/api/locations/countries", { cache: "no-store" });
export const getLocationCities = (params: { countryCode: string; query?: string; limit?: number }) => {
  const searchParams = new URLSearchParams();
  searchParams.set("countryCode", params.countryCode);
  if (params.query) searchParams.set("query", params.query);
  if (typeof params.limit === "number") searchParams.set("limit", String(params.limit));
  return apiRequest<LocationCitiesData>(`/api/locations/cities?${searchParams.toString()}`, { cache: "no-store" });
};
export const updateWeatherLocation = (body: { countryCode: string; cityId: string }) =>
  apiRequest<WeatherLocationUpdateData>("/api/users/me/location", { method: "PATCH", body });
export const getWeatherForecast = (params: { city?: string; countryCode?: string; latitude?: number; longitude?: number; days?: number } = {}) => {
  const searchParams = new URLSearchParams();
  if (params.city) searchParams.set("city", params.city);
  if (params.countryCode) searchParams.set("countryCode", params.countryCode);
  if (typeof params.latitude === "number") searchParams.set("latitude", String(params.latitude));
  if (typeof params.longitude === "number") searchParams.set("longitude", String(params.longitude));
  if (typeof params.days === "number") searchParams.set("days", String(params.days));
  const query = searchParams.toString();
  return apiRequest<WeatherForecastData>(`/api/weather/forecast${query ? `?${query}` : ""}`, { cache: "no-store" });
};
export const updateCurrentUser = (body: unknown) => apiRequest<CurrentUserSummary>("/api/users/me", { method: "PATCH", body });
export const getNotificationPreferences = () => apiRequest<NotificationPreferencesData>("/api/notifications/preferences", { cache: "no-store" });
export const updateNotificationPreferences = (body: unknown) =>
  apiRequest<NotificationPreferencesData>("/api/notifications/preferences", { method: "PATCH", body });
export const requestSignedUploadUrl = (body: unknown) => apiRequest<SignedUploadData>("/api/uploads/signed-url", { method: "POST", body });

export async function uploadImageViaServer(input: { file: File; purpose: string }): Promise<ApiResponse<ServerUploadData>> {
  try {
    const formData = new FormData();
    formData.set("file", input.file);
    formData.set("purpose", input.purpose);

    const response = await fetch("/api/uploads/server-upload", {
      method: "POST",
      body: formData,
      credentials: "include"
    });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return invalidResponse;

    const payload = (await response.json()) as ApiResponse<ServerUploadData>;
    if (payload && typeof payload === "object" && "ok" in payload) return payload;

    return invalidResponse;
  } catch {
    return backendUnavailable;
  }
}
export const getStyleProfile = () => apiRequest<StyleProfileData>("/api/style-profile", { cache: "no-store" });
export const updateStyleProfile = (body: unknown) => apiRequest<StyleProfileData>("/api/style-profile", { method: "PATCH", body });
export const getAvatarProfile = () => apiRequest<AvatarProfileData>("/api/avatar-profile", { cache: "no-store" });
export const updateAvatarProfile = (body: unknown) => apiRequest<AvatarProfileData>("/api/avatar-profile", { method: "PATCH", body });
export const getAvatarPreview = (id: string) => apiRequest<AvatarPreviewData>(`/api/outfits/${id}/avatar-preview`, { cache: "no-store" });
export const generateAvatarPreview = (id: string, options: unknown = {}) =>
  apiRequest<AvatarPreviewData>(`/api/outfits/${id}/avatar-preview`, { method: "POST", body: options });
function filenameFromContentDisposition(header = "") {
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded).replace(/[/\\]/g, "-");
    } catch {
      return encoded.replace(/[/\\]/g, "-");
    }
  }
  const quoted = header.match(/filename="([^"]+)"/i)?.[1] || header.match(/filename=([^;]+)/i)?.[1];
  return quoted ? quoted.trim().replace(/[/\\]/g, "-") : "";
}

export async function downloadAvatarPreview(id: string): Promise<ApiResponse<{ blob: Blob; filename: string }>> {
  try {
    const response = await fetch(`/api/outfits/${encodeURIComponent(id)}/avatar-preview/download`, {
      method: "GET",
      cache: "no-store",
      credentials: "include"
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const payload = (await response.json()) as ApiResponse<{ blob: Blob; filename: string }>;
        if (payload && typeof payload === "object" && "ok" in payload) {
          return payload.ok ? payload : safeApiFailure(payload);
        }
      }
      return invalidResponse;
    }

    const blob = await response.blob();
    const filename = filenameFromContentDisposition(response.headers.get("content-disposition") || "") || "fitpick-virtual-tryon-preview.jpg";
    return {
      ok: true,
      data: { blob, filename }
    };
  } catch {
    return backendUnavailable;
  }
}
export const sendStylistMessage = (message: string, options: SendStylistMessageOptions = {}) =>
  apiRequest<StylistChatData>("/api/stylist/chat", {
    method: "POST",
    body: {
      message,
      ...options
    }
  });
export const createReferenceFashionItem = (body: unknown) =>
  apiRequest<ReferenceFashionItemData>("/api/stylist/reference-items", { method: "POST", body });
export const getReferenceFashionItem = (id: string) =>
  apiRequest<ReferenceFashionItemData>(`/api/stylist/reference-items/${id}`, { cache: "no-store" });
export const analyzeReferenceFashionItem = (id: string) =>
  apiRequest<ReferenceFashionItemData>(`/api/stylist/reference-items/${id}/analyze`, { method: "POST" });
export const selectReferenceFashionItem = (id: string, detectedItemId: string) =>
  apiRequest<ReferenceFashionItemData>(`/api/stylist/reference-items/${id}/selection`, { method: "PATCH", body: { detectedItemId } });
export const getReferenceFashionRecommendations = (id: string, body: unknown = {}) =>
  apiRequest<ReferenceRecommendationsData>(`/api/stylist/reference-items/${id}/recommendations`, { method: "POST", body });
export const addReferenceFashionItemToCloset = (id: string) =>
  apiRequest<ReferenceAddToClosetData>(`/api/stylist/reference-items/${id}/add-to-closet`, { method: "POST" });
export const clearReferenceFashionItem = (id: string) =>
  apiRequest<{ cleared: boolean }>(`/api/stylist/reference-items/${id}`, { method: "DELETE" });
export const pollStylistVisualization = (input: { jobId?: string | null; outfitRecommendationId?: string | null }) => {
  if (input.jobId) return getJobStatus(input.jobId);
  if (input.outfitRecommendationId) return getAvatarPreview(input.outfitRecommendationId);
  return Promise.resolve(invalidResponse);
};
