import "server-only";

import type { Types } from "mongoose";
import { OutfitHistory } from "@/models/OutfitHistory";
import { outfitItemSignature } from "@/lib/recommendation/signature";
export { buildOutfitHistorySummary } from "@/lib/recommendation/history-summary";

export type OutfitHistoryEventType =
  | "generated"
  | "viewed"
  | "downloaded"
  | "expanded"
  | "saved"
  | "accepted"
  | "dismissed"
  | "rejected"
  | "edited"
  | "swapped"
  | "worn"
  | "shared"
  | "virtual_try_on_generated";

type RecordOutfitHistoryInput = {
  userId: string | Types.ObjectId;
  outfitId?: string | Types.ObjectId | null;
  itemIds?: Array<string | Types.ObjectId>;
  eventType: OutfitHistoryEventType;
  source?: "outfit_page" | "stylist_chat" | "manual" | "system";
  recommendationMode?: string;
  occasion?: string;
  context?: Record<string, unknown>;
  scoreBreakdown?: Record<string, unknown>;
  similarityMetadata?: Record<string, unknown>;
  feedbackReason?: string;
  feedbackRating?: number | null;
};

function cleanText(value?: string | null, max = 160) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function eventPatch(eventType: OutfitHistoryEventType, now: Date) {
  const patches: Record<OutfitHistoryEventType, Record<string, unknown>> = {
    generated: { generatedAt: now },
    viewed: { viewedAt: now },
    downloaded: { downloadedAt: now, expandedAt: now, acceptedAt: now },
    expanded: { expandedAt: now },
    saved: { savedAt: now, acceptedAt: now },
    accepted: { acceptedAt: now },
    dismissed: { dismissedAt: now, ignored: true },
    rejected: { rejectedAt: now },
    edited: { editedAt: now },
    swapped: { swappedAt: now, editedAt: now },
    worn: { wornAt: now, acceptedAt: now },
    shared: { sharedAt: now },
    virtual_try_on_generated: { virtualTryOnGeneratedAt: now, expandedAt: now }
  };
  return patches[eventType];
}

export async function recordOutfitHistory(input: RecordOutfitHistoryInput) {
  const itemSignature = outfitItemSignature(input.itemIds || []);
  if (!itemSignature) return null;

  const now = new Date();
  const itemIds = Array.from(new Set((input.itemIds || []).map(String).filter(Boolean)));
  const selector = input.outfitId
    ? { userId: input.userId, outfitId: input.outfitId }
    : { userId: input.userId, itemSignature };

  try {
    return await OutfitHistory.findOneAndUpdate(
      selector,
      {
        $setOnInsert: {
          userId: input.userId,
          outfitId: input.outfitId || null,
          itemIds,
          itemSignature,
          heroItemId: itemIds[0] || null,
          source: input.source || "outfit_page",
          recommendationMode: cleanText(input.recommendationMode || "todays_best", 80) || "todays_best",
          occasion: cleanText(input.occasion || "", 120),
          context: input.context || {},
          scoreBreakdown: input.scoreBreakdown || {},
          similarityMetadata: input.similarityMetadata || {}
        },
        $set: {
          // `generatedAt` is supplied here for generated events and by the schema
          // default for other first-time events. It must not also appear in
          // `$setOnInsert`, because MongoDB rejects conflicting update paths.
          ...eventPatch(input.eventType, now),
          ...(input.feedbackReason !== undefined ? { feedbackReason: cleanText(input.feedbackReason, 500) } : {}),
          ...(typeof input.feedbackRating === "number" ? { feedbackRating: Math.max(1, Math.min(5, input.feedbackRating)) } : {})
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    // A unique user/outfit index makes concurrent successful writes idempotent.
    // If two requests race on the initial upsert, return the winning record.
    if ((error as { code?: number })?.code === 11000) {
      return OutfitHistory.findOne(selector);
    }
    throw error;
  }
}

export async function getRecentOutfitHistory(userId: string | Types.ObjectId, limit = 50) {
  return OutfitHistory.find({ userId })
    .sort({ generatedAt: -1, createdAt: -1 })
    .limit(Math.max(1, Math.min(limit, 120)))
    .lean();
}
