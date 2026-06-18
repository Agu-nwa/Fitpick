import type { ApiFailure, ApiResponse } from "@/types/api";
import type { WardrobeItem, WardrobeSummary } from "@/types/wardrobe";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

const backendUnavailable: ApiFailure = {
  ok: false,
  error: {
    code: "INTERNAL_ERROR",
    message: "FitPick services are not reachable right now. Please try again shortly."
  }
};

const invalidResponse: ApiFailure = {
  ok: false,
  error: {
    code: "INTERNAL_ERROR",
    message: "FitPick received an unexpected response. Please try again."
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
    if (payload && typeof payload === "object" && "ok" in payload) return payload;

    return invalidResponse;
  } catch {
    return backendUnavailable;
  }
}

export type BackendHealth = {
  service: string;
  status: string;
  databaseConfigured: boolean;
  timestamp: string;
};

export type CurrentUserSummary = {
  user?: {
    id: string;
    name: string;
    email: string;
    plan: "free" | "plus";
  };
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
  imageUrl?: string;
  thumbnailUrl?: string;
  suggestedTags: Record<string, unknown>;
  reviewedAt: string | null;
  createdItemId: string | null;
};

export type SignedUploadData = {
  upload: {
    ready: boolean;
    provider: string;
    storageKey: string;
    uploadUrl?: string;
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

export type WardrobeUploadData = {
  upload: WardrobeUploadRecord;
  storage?: {
    provider: string;
    ready: boolean;
    mode: string;
  };
  nextAction?: string;
};

export type WardrobeUploadReviewData = {
  item: WardrobeItem;
  upload: WardrobeUploadRecord;
  nextAction?: string;
};

export const getBackendHealth = () => apiRequest<BackendHealth>("/api/health", { cache: "no-store" });
export const getCurrentUser = () => apiRequest<CurrentUserSummary>("/api/auth/me", { cache: "no-store" });
export const register = (body: unknown) => apiRequest("/api/auth/register", { method: "POST", body });
export const login = (body: unknown) => apiRequest("/api/auth/login", { method: "POST", body });
export const logout = () => apiRequest("/api/auth/logout", { method: "POST" });
export const getPreferences = () => apiRequest("/api/preferences");
export const updatePreferences = (body: unknown) => apiRequest("/api/preferences", { method: "PATCH", body });
export const getOccasions = () => apiRequest("/api/occasions");
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
export const reviewWardrobeUploadTags = (uploadId: string, body: unknown) =>
  apiRequest<WardrobeUploadReviewData>(`/api/wardrobe/upload/${uploadId}/review-tags`, { method: "POST", body });
export const createRecommendation = (body: unknown) => apiRequest("/api/outfits/recommend", { method: "POST", body });
export const getOutfit = (id: string) => apiRequest(`/api/outfits/${id}`);
export const swapOutfitItem = (id: string, body: unknown) => apiRequest(`/api/outfits/${id}/swap`, { method: "POST", body });
export const saveOutfit = (id: string, body: unknown) => apiRequest(`/api/outfits/${id}/save`, { method: "POST", body });
export const wearOutfit = (id: string, body: unknown) => apiRequest(`/api/outfits/${id}/wear`, { method: "POST", body });
export const submitOutfitFeedback = (id: string, body: unknown) => apiRequest(`/api/outfits/${id}/feedback`, { method: "POST", body });
export const getLooks = () => apiRequest("/api/looks");
export const getPlusStatus = () => apiRequest("/api/billing/plus-status");
export const getNotificationPreferences = () => apiRequest("/api/notifications/preferences");
export const updateNotificationPreferences = (body: unknown) =>
  apiRequest("/api/notifications/preferences", { method: "PATCH", body });
export const requestSignedUploadUrl = (body: unknown) => apiRequest<SignedUploadData>("/api/uploads/signed-url", { method: "POST", body });
