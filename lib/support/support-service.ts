import crypto from "crypto";
import mongoose, { Types } from "mongoose";
import { getGeneratedImageUrl } from "@/lib/storage/generated-images";
import { normalizeStorageKey } from "@/lib/storage/url";
import { BackgroundJob } from "@/models/BackgroundJob";
import { CreditPurchase } from "@/models/CreditPurchase";
import { CreditTransaction } from "@/models/CreditTransaction";
import { OutfitRecommendation } from "@/models/OutfitRecommendation";
import { ReferenceFashionItem } from "@/models/ReferenceFashionItem";
import { SupportConversation, type SupportConversationDocument } from "@/models/SupportConversation";
import { SupportInternalNote, type SupportInternalNoteDocument } from "@/models/SupportInternalNote";
import { SupportMessage, type SupportMessageDocument } from "@/models/SupportMessage";
import { TryOnGeneration } from "@/models/TryOnGeneration";
import { User, type UserDocument } from "@/models/User";
import { WardrobeItem } from "@/models/WardrobeItem";
import { WardrobeUpload } from "@/models/WardrobeUpload";
import type {
  SupportAttachment,
  SupportAvailability,
  SupportConversationStatus,
  SupportConversationSummary,
  SupportInternalNote as SerializedSupportInternalNote,
  SupportMessage as SerializedSupportMessage,
  SupportOperationalContext,
  SupportSenderType
} from "@/types/support";

type Actor = { userId: string; role: "user" | "admin" };
type SerializedUser = { id: string; name: string; email: string };

const activeStatuses: SupportConversationStatus[] = ["open", "pending"];

function asObjectId(value: string) {
  if (!Types.ObjectId.isValid(value)) throw new Error("invalid_object_id");
  return new Types.ObjectId(value);
}

function dateOrNull(value?: Date | null) {
  return value ? value.toISOString() : null;
}

function compactText(value: string, max = 180) {
  return value
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function safeIssue(value?: string | null) {
  return compactText(value || "", 180);
}

function populatedUser(value: unknown): SerializedUser {
  if (value && typeof value === "object" && "_id" in value) {
    const user = value as UserDocument;
    return { id: String(user._id), name: user.name || "Customer", email: user.email || "" };
  }
  return { id: String(value || ""), name: "Customer", email: "" };
}

function populatedAgent(value: unknown) {
  if (value && typeof value === "object" && "_id" in value) {
    const user = value as UserDocument;
    return { id: String(user._id), name: user.name || "Support" };
  }
  return null;
}

export function isSupportAgent(actor: Actor) {
  return actor.role === "admin";
}

export function sanitizeSupportMessage(value: string) {
  return compactText(value, 4000);
}

export function createSupportAttachmentStorageKey(input: { actorId: string; filename: string }) {
  const extension = input.filename.includes(".") ? input.filename.split(".").pop()?.toLowerCase() : "jpg";
  const safeFilename =
    input.filename
      .toLowerCase()
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "support-image";

  return normalizeStorageKey(`support/${input.actorId}/${Date.now()}-${crypto.randomUUID()}-${safeFilename}.${extension || "jpg"}`);
}

export function supportAttachmentBelongsToActor(input: { actorId: string; key: string }) {
  return normalizeStorageKey(input.key).startsWith(`support/${input.actorId}/`);
}

export function serializeSupportMessage(message: SupportMessageDocument): SerializedSupportMessage {
  return {
    id: String(message._id),
    conversationId: String(message.conversationId),
    senderType: message.senderType as SupportSenderType,
    senderId: String(message.senderId),
    body: message.body || "",
    attachments: (message.attachments || []).map((attachment) => ({
      key: attachment.key,
      url: attachment.url,
      filename: attachment.filename,
      mimeType: attachment.mimeType as "image/jpeg" | "image/webp",
      size: attachment.size,
      width: attachment.width,
      height: attachment.height
    })),
    readAt: dateOrNull(message.readAt),
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString()
  };
}

export function serializeSupportConversation(conversation: SupportConversationDocument): SupportConversationSummary {
  const customer = populatedUser(conversation.userId);
  const agent = populatedAgent(conversation.assignedAgentId);
  return {
    id: String(conversation._id),
    userId: customer.id,
    userName: customer.name,
    userEmail: customer.email,
    status: conversation.status as SupportConversationStatus,
    assignedAgentId: agent?.id || null,
    assignedAgentName: agent?.name || null,
    lastMessageAt: dateOrNull(conversation.lastMessageAt),
    latestMessagePreview: conversation.latestMessagePreview || "",
    userUnreadCount: conversation.userUnreadCount || 0,
    supportUnreadCount: conversation.supportUnreadCount || 0,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString()
  };
}

export function serializeSupportInternalNote(note: SupportInternalNoteDocument): SerializedSupportInternalNote {
  const author = populatedAgent(note.authorId) || { id: String(note.authorId), name: "Support" };
  return {
    id: String(note._id),
    conversationId: String(note.conversationId),
    authorId: author.id,
    authorName: author.name,
    body: note.body,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString()
  };
}

export async function findActiveSupportConversation(userId: string) {
  return SupportConversation.findOne({ userId: asObjectId(userId), status: { $in: activeStatuses } })
    .sort({ lastMessageAt: -1, createdAt: -1 })
    .populate("userId", "name email")
    .populate("assignedAgentId", "name email");
}

export async function getOrCreateSupportConversation(userId: string) {
  const existing = await findActiveSupportConversation(userId);
  if (existing) return existing;

  try {
    const conversation = await SupportConversation.create({ userId: asObjectId(userId), status: "open", lastMessageAt: null });
    return SupportConversation.findById(conversation._id).populate("userId", "name email").populate("assignedAgentId", "name email").orFail();
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000) {
      const raced = await findActiveSupportConversation(userId);
      if (raced) return raced;
    }
    throw error;
  }
}

export async function getSupportConversationForActor(input: { conversationId: string; actor: Actor }) {
  const query: Record<string, unknown> = { _id: asObjectId(input.conversationId) };
  if (!isSupportAgent(input.actor)) query.userId = asObjectId(input.actor.userId);
  return SupportConversation.findOne(query).populate("userId", "name email").populate("assignedAgentId", "name email");
}

export async function listSupportMessages(input: { conversationId: string; cursor?: string | null; limit?: number }) {
  const query: Record<string, unknown> = { conversationId: asObjectId(input.conversationId) };
  if (input.cursor && Types.ObjectId.isValid(input.cursor)) query._id = { $lt: asObjectId(input.cursor) };
  const limit = Math.min(Math.max(input.limit || 30, 1), 50);
  const messages = await SupportMessage.find(query).sort({ _id: -1 }).limit(limit + 1);
  const hasMore = messages.length > limit;
  const page = (hasMore ? messages.slice(0, limit) : messages).reverse();
  return { messages: page.map(serializeSupportMessage), nextCursor: hasMore ? String(messages[limit - 1]._id) : null };
}

async function normalizeMessageAttachments(input: { actorId: string; attachments: SupportAttachment[] }) {
  const normalized: SupportAttachment[] = [];
  for (const attachment of input.attachments) {
    const key = normalizeStorageKey(attachment.key);
    if (!supportAttachmentBelongsToActor({ actorId: input.actorId, key })) throw new Error("support_attachment_forbidden");
    normalized.push({ ...attachment, key, url: await getGeneratedImageUrl(key), filename: compactText(attachment.filename, 160) || "support-image.jpg" });
  }
  return normalized;
}

export async function createSupportMessage(input: {
  conversationId: string;
  actor: Actor;
  body: string;
  attachments: SupportAttachment[];
  idempotencyKey?: string;
}) {
  const conversation = await getSupportConversationForActor({ conversationId: input.conversationId, actor: input.actor });
  if (!conversation) throw new Error("support_conversation_not_found");

  const senderType: SupportSenderType = isSupportAgent(input.actor) ? "support" : "user";
  const body = sanitizeSupportMessage(input.body);
  const attachments = await normalizeMessageAttachments({ actorId: input.actor.userId, attachments: input.attachments });
  const preview = body || (attachments.length ? "Image attached" : "");
  const idempotencyKey = compactText(input.idempotencyKey || "", 100);
  let message: SupportMessageDocument | null = null;
  let created = false;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      try {
        const [createdMessage] = await SupportMessage.create(
          [{ conversationId: conversation._id, senderType, senderId: asObjectId(input.actor.userId), body, attachments, idempotencyKey }],
          { session }
        );
        message = createdMessage;
        created = true;
      } catch (error) {
        if (idempotencyKey && error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000) {
          message = await SupportMessage.findOne({ conversationId: conversation._id, senderType, senderId: asObjectId(input.actor.userId), idempotencyKey })
            .session(session)
            .orFail();
          return;
        }
        throw error;
      }

      await SupportConversation.updateOne(
        { _id: conversation._id },
        {
          $set: { status: senderType === "user" && conversation.status === "resolved" ? "open" : conversation.status, lastMessageAt: new Date(), latestMessagePreview: preview },
          $inc: senderType === "user" ? { supportUnreadCount: 1 } : { userUnreadCount: 1 }
        },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  if (!message) throw new Error("support_message_not_persisted");
  const updatedConversation = await SupportConversation.findById(conversation._id).populate("userId", "name email").populate("assignedAgentId", "name email").orFail();

  return { message: serializeSupportMessage(message), conversation: serializeSupportConversation(updatedConversation), deduplicated: !created };
}

export async function markSupportMessagesRead(input: { conversationId: string; actor: Actor }) {
  const conversation = await getSupportConversationForActor(input);
  if (!conversation) throw new Error("support_conversation_not_found");

  const readerIsSupport = isSupportAgent(input.actor);
  await SupportMessage.updateMany(
    { conversationId: conversation._id, senderType: readerIsSupport ? "user" : "support", readAt: null },
    { $set: { readAt: new Date() } }
  );
  const updated = await SupportConversation.findByIdAndUpdate(
    conversation._id,
    { $set: readerIsSupport ? { supportUnreadCount: 0 } : { userUnreadCount: 0 } },
    { new: true }
  )
    .populate("userId", "name email")
    .populate("assignedAgentId", "name email")
    .orFail();

  return serializeSupportConversation(updated);
}

export async function listAdminSupportConversations(input: { status?: SupportConversationStatus | "all"; unread?: "all" | "support"; search?: string }) {
  const query: Record<string, unknown> = {};
  if (input.status && input.status !== "all") query.status = input.status;
  if (input.unread === "support") query.supportUnreadCount = { $gt: 0 };

  let conversations = await SupportConversation.find(query)
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .limit(100)
    .populate("userId", "name email")
    .populate("assignedAgentId", "name email");

  const search = compactText(input.search || "", 80).toLowerCase();
  if (search) {
    conversations = conversations.filter((conversation) => {
      const user = populatedUser(conversation.userId);
      return [user.name, user.email, conversation.latestMessagePreview].some((value) => value.toLowerCase().includes(search));
    });
  }

  return conversations.map(serializeSupportConversation);
}

export async function updateSupportConversationStatus(input: { conversationId: string; actor: Actor; status: SupportConversationStatus }) {
  if (!isSupportAgent(input.actor)) throw new Error("support_forbidden");
  const updated = await SupportConversation.findByIdAndUpdate(asObjectId(input.conversationId), { $set: { status: input.status } }, { new: true })
    .populate("userId", "name email")
    .populate("assignedAgentId", "name email");
  if (!updated) throw new Error("support_conversation_not_found");
  return serializeSupportConversation(updated);
}

export async function updateSupportConversationAssignment(input: { conversationId: string; actor: Actor; assignedAgentId?: string | null }) {
  if (!isSupportAgent(input.actor)) throw new Error("support_forbidden");
  const assignedAgentId = input.assignedAgentId === undefined ? input.actor.userId : input.assignedAgentId;
  if (assignedAgentId) {
    const agent = await User.findOne({ _id: asObjectId(assignedAgentId), role: "admin" }).select("_id");
    if (!agent) throw new Error("support_agent_not_found");
  }
  const updated = await SupportConversation.findByIdAndUpdate(
    asObjectId(input.conversationId),
    { $set: { assignedAgentId: assignedAgentId ? asObjectId(assignedAgentId) : null } },
    { new: true }
  )
    .populate("userId", "name email")
    .populate("assignedAgentId", "name email");
  if (!updated) throw new Error("support_conversation_not_found");
  return serializeSupportConversation(updated);
}

export async function listSupportInternalNotes(input: { conversationId: string; actor: Actor }) {
  if (!isSupportAgent(input.actor)) throw new Error("support_forbidden");
  const conversation = await getSupportConversationForActor(input);
  if (!conversation) throw new Error("support_conversation_not_found");
  const notes = await SupportInternalNote.find({ conversationId: conversation._id }).sort({ createdAt: -1 }).limit(50).populate("authorId", "name email");
  return notes.map(serializeSupportInternalNote);
}

export async function createSupportInternalNote(input: { conversationId: string; actor: Actor; body: string }) {
  if (!isSupportAgent(input.actor)) throw new Error("support_forbidden");
  const conversation = await getSupportConversationForActor(input);
  if (!conversation) throw new Error("support_conversation_not_found");
  const note = await SupportInternalNote.create({
    conversationId: conversation._id,
    authorId: asObjectId(input.actor.userId),
    body: compactText(input.body, 2000)
  });
  await note.populate("authorId", "name email");
  return serializeSupportInternalNote(note);
}

export async function getAdminSupportOperationalContext(input: { conversationId: string; actor: Actor }): Promise<SupportOperationalContext> {
  if (!isSupportAgent(input.actor)) throw new Error("support_forbidden");
  const conversation = await getSupportConversationForActor(input);
  if (!conversation) throw new Error("support_conversation_not_found");
  const customer = populatedUser(conversation.userId);
  const userId = asObjectId(customer.id);

  const [user, itemCount, readyCount, needsCareCount, uploads, tryOns, outfits, referenceItems, jobs, transactions, purchases] = await Promise.all([
    User.findById(userId),
    WardrobeItem.countDocuments({ userId, archivedAt: null }),
    WardrobeItem.countDocuments({ userId, archivedAt: null, condition: "ready" }),
    WardrobeItem.countDocuments({ userId, archivedAt: null, condition: "needs-care" }),
    WardrobeUpload.find({ userId }).sort({ createdAt: -1 }).limit(5).select("selectedCategory uploadStatus aiTagStatus enrichmentStatus aiErrorSafeMessage createdAt updatedAt"),
    TryOnGeneration.find({ userId }).sort({ createdAt: -1 }).limit(5).select("generationId status failureStage failureCode failureMessage creditsReserved creditsCommitted creditsReleased createdAt completedAt failedAt"),
    OutfitRecommendation.find({ userId }).sort({ createdAt: -1 }).limit(5).select("title source occasion preview.status completenessStatus createdAt"),
    ReferenceFashionItem.find({ userId }).sort({ createdAt: -1 }).limit(5).select("status category primaryColor usableForMatching outfitRecommendationIds createdAt"),
    BackgroundJob.find({ userId }).sort({ createdAt: -1 }).limit(8).select("type status attempts errorMessage createdAt updatedAt"),
    CreditTransaction.find({ user: userId }).sort({ createdAt: -1 }).limit(5).select("feature credits status balanceAfter createdAt"),
    CreditPurchase.find({ userId }).sort({ createdAt: -1 }).limit(5).select("packName credits amountMinor currency provider status createdAt")
  ]);

  if (!user) throw new Error("support_user_not_found");

  return {
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      accountStatus: "active",
      credits: typeof user.credits === "number" ? user.credits : 0,
      joinedAt: dateOrNull(user.createdAt),
      lastLoginAt: dateOrNull(user.lastLoginAt),
      modelSetupCompletedAt: dateOrNull(user.modelSetupCompletedAt)
    },
    wardrobe: {
      itemCount,
      readyCount,
      needsCareCount,
      latestUploads: uploads.map((upload) => ({
        id: String(upload._id),
        category: upload.selectedCategory || "unknown",
        uploadStatus: upload.uploadStatus || "unknown",
        aiTagStatus: upload.aiTagStatus || "unknown",
        enrichmentStatus: upload.enrichmentStatus || "unknown",
        safeIssue: safeIssue(upload.aiErrorSafeMessage),
        createdAt: upload.createdAt.toISOString(),
        updatedAt: upload.updatedAt.toISOString()
      }))
    },
    tryOn: {
      latest: tryOns.map((generation) => ({
        id: String(generation._id),
        generationId: generation.generationId,
        status: generation.status,
        failureStage: generation.failureStage || "",
        failureCode: generation.failureCode || "",
        safeIssue: safeIssue(generation.failureMessage),
        creditsReserved: generation.creditsReserved || 0,
        creditsCommitted: generation.creditsCommitted || 0,
        creditsReleased: generation.creditsReleased || 0,
        createdAt: generation.createdAt.toISOString(),
        completedAt: dateOrNull(generation.completedAt),
        failedAt: dateOrNull(generation.failedAt)
      }))
    },
    outfits: {
      latest: outfits.map((outfit) => ({
        id: String(outfit._id),
        title: outfit.title || "Untitled look",
        source: outfit.source || "unknown",
        occasion: outfit.occasion || "",
        previewStatus: outfit.preview?.status || "not_started",
        completenessStatus: outfit.completenessStatus || "unknown",
        createdAt: outfit.createdAt.toISOString()
      }))
    },
    matchOutfit: {
      latest: referenceItems.map((item) => ({
        id: String(item._id),
        status: item.status,
        category: item.category || "unknown",
        primaryColor: item.primaryColor || "unknown",
        usableForMatching: Boolean(item.usableForMatching),
        recommendationCount: item.outfitRecommendationIds?.length || 0,
        createdAt: item.createdAt.toISOString()
      }))
    },
    jobs: {
      latest: jobs.map((job) => ({
        id: String(job._id),
        type: job.type,
        status: job.status,
        attempts: job.attempts || 0,
        safeIssue: safeIssue(job.errorMessage),
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString()
      }))
    },
    credits: {
      latestTransactions: transactions.map((transaction) => ({
        id: String(transaction._id),
        feature: transaction.feature,
        credits: transaction.credits,
        status: transaction.status,
        balanceAfter: typeof transaction.balanceAfter === "number" ? transaction.balanceAfter : null,
        createdAt: transaction.createdAt.toISOString()
      })),
      latestPurchases: purchases.map((purchase) => ({
        id: String(purchase._id),
        packName: purchase.packName,
        credits: purchase.credits,
        amountMinor: purchase.amountMinor,
        currency: purchase.currency,
        provider: purchase.provider,
        status: purchase.status,
        createdAt: purchase.createdAt.toISOString()
      }))
    }
  };
}

export function supportAvailabilityFromAgentCount(count: number): SupportAvailability {
  return count > 0 ? "online" : "offline";
}
