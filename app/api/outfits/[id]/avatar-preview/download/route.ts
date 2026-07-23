export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { getGeneratedImageUrl } from "@/lib/storage/generated-images";
import { storageKeyBelongsToUser } from "@/lib/storage";
import { normalizeStorageKey } from "@/lib/storage/url";
import { isObjectId } from "@/lib/wardrobe";
import { AvatarOutfitPreview } from "@/models/AvatarOutfitPreview";
import { OutfitRecommendation } from "@/models/OutfitRecommendation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const imageContentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const extensionByContentType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

function safeFilenamePart(value: unknown) {
  const cleaned = String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return cleaned || "look";
}

function attachmentFilename(input: { label?: string; contentType: string }) {
  const date = new Date().toISOString().slice(0, 10);
  const extension = extensionByContentType[input.contentType] || "jpg";
  return `fitpick-${safeFilenamePart(input.label)}-virtual-tryon-${date}.${extension}`;
}

function contentDisposition(filename: string) {
  const ascii = filename.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function isOwnedPreviewStorage(userId: string, storageKey: string) {
  return (
    storageKeyBelongsToUser({ userId, storageKey, prefix: "avatar-previews" }) ||
    storageKeyBelongsToUser({ userId, storageKey, prefix: "generated-previews" })
  );
}

export async function GET(request: NextRequest, context: RouteContext) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `avatar-preview:download:${meta.ip}`, limit: 30, windowMs: 60 * 1000, operation: "avatar-preview-download" });
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "Preview was not found.");

    const userId = String(auth.user._id);
    const preview = await AvatarOutfitPreview.findOne({
      userId: auth.user._id,
      outfitId: id,
      status: "ready",
      imageUrl: { $ne: "" },
      storageKey: { $ne: "" }
    }).sort({ updatedAt: -1 }).lean() as any;

    const storageKey = normalizeStorageKey(preview?.storageKey || "");
    if (!preview || !storageKey || !isOwnedPreviewStorage(userId, storageKey)) {
      return apiError("NOT_FOUND", "Preview was not found.");
    }

    const durableUrl = await getGeneratedImageUrl(storageKey);
    let url: URL;
    try {
      url = new URL(durableUrl);
    } catch {
      return apiError("INTERNAL_ERROR", "Preview download is not available right now.");
    }
    if (url.protocol !== "https:" || url.search) {
      return apiError("INTERNAL_ERROR", "Preview download is not available right now.");
    }

    const response = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok || !response.body) {
      return apiError("INTERNAL_ERROR", "Unable to prepare this preview download right now.");
    }

    const contentType = (response.headers.get("content-type") || "image/jpeg").split(";")[0].toLowerCase();
    if (!imageContentTypes.has(contentType)) {
      return apiError("INTERNAL_ERROR", "Preview download is not available right now.");
    }

    const outfit = await OutfitRecommendation.findOne({ _id: id, userId: auth.user._id }).select("title occasion").lean() as any;
    const filename = attachmentFilename({ label: outfit?.occasion || outfit?.title || "look", contentType });
    const headers = new Headers({
      "content-type": contentType,
      "content-disposition": contentDisposition(filename),
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff"
    });
    const contentLength = response.headers.get("content-length");
    if (contentLength) headers.set("content-length", contentLength);

    await recordAuditEvent({
      request,
      userId,
      action: "avatar_preview.download",
      entityType: "AvatarOutfitPreview",
      entityId: String(preview._id)
    });

    return new Response(response.body, {
      status: 200,
      headers
    });
  } catch (error) {
    logSafeError("avatar-preview.download", error);
    return apiError("INTERNAL_ERROR", "Unable to download this preview right now.");
  }
}
