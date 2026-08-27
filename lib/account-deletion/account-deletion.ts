import crypto from "node:crypto";
import mongoose from "mongoose";
import { deleteStoredObject, storageKeyBelongsToUser } from "@/lib/storage";
import { AccountDeletionRequest } from "@/models/AccountDeletionRequest";
import { BackgroundJob } from "@/models/BackgroundJob";
import { User } from "@/models/User";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { logSafeError } from "@/lib/security/safe-log";

const deletableCollections = [
  "appnotifications", "avataroutfitpreviews", "avatarprofiles", "dailyusages", "fashionmemories",
  "garmentassets", "notificationpreferences", "occasions", "outfits", "outfitfeedbacks", "outfithistories",
  "outfitpreviews", "outfitrecommendations", "privacypreferences", "privacyrequests", "progressivepromptstates",
  "referencefashionitems", "stylepreferences", "styleprofiles", "tryongenerations", "wardrobecompatibilityedges",
  "stylistplans", "wardrobeitems", "wardrobeuploads", "wardrobeuploadbatches", "wornlooks"
] as const;

const retainedCollections = ["creditpurchases", "credittransactions", "auditevents", "processedpaymentevents"] as const;

function emailHash(email: string) {
  const key = process.env.JWT_SECRET || "fitpick-deletion-reference";
  return crypto.createHmac("sha256", key).update(email.trim().toLowerCase()).digest("hex");
}

function collectStorageKeys(value: unknown, output = new Set<string>()): Set<string> {
  if (!value || typeof value !== "object") return output;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectStorageKeys(entry, output));
    return output;
  }
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if ((/storageKey$/i.test(key) || key === "key") && typeof entry === "string" && entry.trim()) output.add(entry.trim());
    else collectStorageKeys(entry, output);
  }
  return output;
}

export function isOwnedDeletionKey(userId: string, key: string) {
  return ["wardrobe", "generated-previews", "avatar-previews"].some((prefix) =>
    storageKeyBelongsToUser({ userId, storageKey: key, prefix: prefix as "wardrobe" | "generated-previews" | "avatar-previews" })
  ) || key.startsWith(`support/${userId}/`);
}

async function collectUserObjectKeys(userId: string) {
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database is unavailable for account deletion.");
  const sources = ["avatarprofiles", "wardrobeitems", "wardrobeuploads", "wardrobeuploadbatches", "garmentassets", "referencefashionitems", "outfitpreviews", "avataroutfitpreviews", "outfitrecommendations", "tryongenerations"];
  const keys = new Set<string>();
  for (const collectionName of sources) {
    const records = await db.collection(collectionName).find({ userId: new mongoose.Types.ObjectId(userId) }).toArray();
    records.forEach((record) => collectStorageKeys(record, keys));
  }
  const conversations = await db.collection("supportconversations").find({ userId: new mongoose.Types.ObjectId(userId) }).project({ _id: 1 }).toArray();
  if (conversations.length) {
    const messages = await db.collection("supportmessages").find({ conversationId: { $in: conversations.map((entry) => entry._id) } }).toArray();
    messages.forEach((record) => collectStorageKeys(record, keys));
  }

  const objectId = new mongoose.Types.ObjectId(userId);
  const supportConversations = await db.collection("supportconversations")
    .find({ userId: objectId })
    .project({ _id: 1 })
    .toArray();
  const supportConversationIds = supportConversations.map((entry) => entry._id);
  if (supportConversationIds.length) {
    const supportMessages = await db.collection("supportmessages")
      .find({ conversationId: { $in: supportConversationIds } })
      .project({ attachments: 1 })
      .toArray();
    for (const message of supportMessages) collectStorageKeys(message.attachments, keys);
  }
  return Array.from(keys).filter((key) => isOwnedDeletionKey(userId, key));
}

async function deleteExternalSupportData(db: NonNullable<typeof mongoose.connection.db>, subjectEmail: string) {
  const email = subjectEmail.trim().toLowerCase();
  if (!email) return { customers: 0, conversations: 0, messages: 0 };

  const customers = await db.collection("externalsupportcustomers")
    .find({ email })
    .project({ _id: 1, externalId: 1 })
    .toArray();
  if (!customers.length) return { customers: 0, conversations: 0, messages: 0 };

  const customerIds = customers.map((entry) => entry._id);
  const conversations = await db.collection("externalsupportconversations")
    .find({ customerId: { $in: customerIds } })
    .project({ _id: 1 })
    .toArray();
  const conversationIds = conversations.map((entry) => entry._id);
  let deletedMessages = 0;
  if (conversationIds.length) {
    deletedMessages = (await db.collection("externalsupportmessages").deleteMany({ conversationId: { $in: conversationIds } })).deletedCount;
    await db.collection("externalsupportconversations").deleteMany({ _id: { $in: conversationIds } });
  }
  await db.collection("externalsupportcustomers").deleteMany({ _id: { $in: customerIds } });

  return { customers: customerIds.length, conversations: conversationIds.length, messages: deletedMessages };
}

async function sendDeletionProgressEmail(input: { to: string; reference: string; pendingProviders: number }) {
  if (!input.to) return;
  const pending = input.pendingProviders > 0;
  const subject = pending ? "Your MyFitPick account deletion is being completed" : "Your MyFitPick account has been deleted";
  const body = pending
    ? "Your account access and MyFitPick profile data have been removed. A limited number of provider cleanup checks are still in progress. We will not mark the request complete until those checks finish."
    : "Your MyFitPick account and associated profile data have been deleted. Limited transaction or security records may remain only where legally required.";
  await sendTransactionalEmail({
    to: input.to,
    subject,
    text: `${body}\n\nDeletion reference: ${input.reference}`,
    html: `<div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#171514;max-width:560px;margin:0 auto;padding:24px"><p style="font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#557C78">MyFitPick</p><h1 style="font-size:24px;margin:8px 0 16px">${subject}</h1><p style="font-size:15px;color:#5f5a55">${body}</p><p style="font-size:13px;color:#69635D;margin-top:24px">Deletion reference: ${input.reference}</p></div>`
  });
}

export async function createAccountDeletionRequest(input: { user: any; reason?: string }) {
  const userId = String(input.user._id);
  const now = new Date();
  const existing = await AccountDeletionRequest.findOne({ userId }).select("+subjectEmail +objectKeys");
  if (existing && !["failed", "cancelled"].includes(existing.status)) return existing;

  const request = await AccountDeletionRequest.findOneAndUpdate(
    { userId },
    {
      $set: {
        deletionReference: existing?.deletionReference || crypto.randomUUID(),
        subjectEmail: input.user.email,
        subjectEmailHash: emailHash(input.user.email),
        status: "validated",
        reason: input.reason || "",
        requestedAt: now,
        validatedAt: now,
        lastError: ""
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return request;
}

export async function disableAccountForDeletion(userId: string) {
  const now = new Date();
  await User.updateOne({ _id: userId }, {
    $set: { deletionStatus: "pending", deletionRequestedAt: now, activeSessionId: "" }
  });
  await BackgroundJob.updateMany(
    { userId, type: { $ne: "account_deletion" }, status: { $in: ["queued", "processing"] } },
    { $set: { status: "cancelled", completedAt: now, errorMessage: "Cancelled because account deletion was requested." } }
  );
  return AccountDeletionRequest.findOneAndUpdate(
    { userId, status: { $nin: ["completed", "completed_with_retained_records"] } },
    { $set: { status: "access_disabled", accessDisabledAt: now } },
    { new: true }
  );
}

export async function runAccountDeletionJob(userId: string) {
  await disableAccountForDeletion(userId);
  const request = await AccountDeletionRequest.findOne({ userId }).select("+subjectEmail +objectKeys");
  if (!request) throw new Error("Account deletion request was not found.");
  if (["completed", "completed_with_retained_records"].includes(request.status)) return request;
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database is unavailable for account deletion.");

  try {
    request.status = "local_deletion_in_progress";
    request.lastError = "";
    await request.save();

    const objectKeys = request.objectKeys.length ? request.objectKeys : await collectUserObjectKeys(userId);
    request.objectKeys = objectKeys;
    await request.save();

    const objectId = new mongoose.Types.ObjectId(userId);
    const conversations = await db.collection("supportconversations").find({ userId: objectId }).project({ _id: 1 }).toArray();
    const conversationIds = conversations.map((entry) => entry._id);
    if (conversationIds.length) {
      await db.collection("supportmessages").deleteMany({ conversationId: { $in: conversationIds } });
      await db.collection("supportinternalnotes").deleteMany({ conversationId: { $in: conversationIds } });
      await db.collection("supportconversations").deleteMany({ _id: { $in: conversationIds } });
    }
    for (const collectionName of deletableCollections) await db.collection(collectionName).deleteMany({ userId: objectId });
    await db.collection("backgroundjobs").deleteMany({ userId: objectId, type: { $ne: "account_deletion" } });

    const supportConversations = await db.collection("supportconversations")
      .find({ userId: objectId })
      .project({ _id: 1 })
      .toArray();
    const supportConversationIds = supportConversations.map((entry) => entry._id);
    if (supportConversationIds.length) {
      await Promise.all([
        db.collection("supportmessages").deleteMany({ conversationId: { $in: supportConversationIds } }),
        db.collection("supportinternalnotes").deleteMany({ conversationId: { $in: supportConversationIds } }),
        db.collection("supportconversations").deleteMany({ _id: { $in: supportConversationIds } })
      ]);
    }
    if (request.subjectEmail) {
      await db.collection("emailotps").deleteMany({ email: request.subjectEmail.toLowerCase() });
      await deleteExternalSupportData(db, request.subjectEmail);
    }

    // Remove user references from shared support administration records without
    // deleting other customers' conversations or operational tenant records.
    await db.collection("supportconversations").updateMany({ assignedAgentId: objectId }, { $set: { assignedAgentId: null } });
    await db.collection("supportapikeys").updateMany({ createdByUserId: objectId }, { $set: { createdByUserId: null } });
    await db.collection("supporttenants").updateMany({ createdByUserId: objectId }, { $set: { createdByUserId: null } });

    request.status = "object_storage_deletion_in_progress";
    await request.save();
    let deletedObjectCount = request.deletedObjectCount || 0;
    for (const key of objectKeys.slice(deletedObjectCount)) {
      const result = await deleteStoredObject({ storageKey: key });
      if (!result.deleted) throw new Error("A user-owned object could not be deleted from storage.");
      deletedObjectCount += 1;
      request.deletedObjectCount = deletedObjectCount;
      await request.save();
    }

    request.status = "provider_cleanup_in_progress";
    request.set("providerActions", [
      { provider: "AWS S3", action: "Delete referenced user-owned objects", status: "completed", identifier: request.deletionReference, completedAt: new Date(), evidenceReference: `${deletedObjectCount} objects deleted`, error: "" },
      { provider: "Stripe", action: "Retain legally required transaction records; remove unnecessary customer profile data after finance review", status: "manual_pending", identifier: request.deletionReference, requestedAt: new Date(), completedAt: null, evidenceReference: "", error: "" },
      { provider: "RevenueCat / Apple", action: "Review purchaser profile and statutory transaction retention", status: "manual_pending", identifier: request.deletionReference, requestedAt: new Date(), completedAt: null, evidenceReference: "", error: "" },
      { provider: "OpenAI / FASHN", action: "Confirm contractual provider retention; no supported per-request deletion API is implemented", status: "manual_pending", identifier: request.deletionReference, requestedAt: new Date(), completedAt: null, evidenceReference: "", error: "" },
      { provider: "Sentry", action: "Review and remove identifiable user context where available", status: "manual_pending", identifier: request.deletionReference, requestedAt: new Date(), completedAt: null, evidenceReference: "", error: "" },
      { provider: "Resend", action: "No application-managed mailbox record identified; confirm provider retention contractually", status: "manual_pending", identifier: request.deletionReference, requestedAt: new Date(), completedAt: null, evidenceReference: "", error: "" }
    ]);
    request.retainedRecordClasses = [...retainedCollections, "accountdeletionrequests"];
    request.localDeletionCompletedAt = new Date();
    request.providerCleanupUpdatedAt = new Date();
    await request.save();

    await User.updateOne({ _id: objectId }, {
      $set: {
        name: "Deleted user",
        email: `deleted+${request.deletionReference}@invalid.local`,
        avatarUrl: "",
        passwordHash: "",
        activeSessionId: "",
        deletionStatus: "pending",
        weatherLocationName: "",
        weatherCountryCode: "",
        weatherCountryName: "",
        weatherCityName: "",
        weatherLatitude: null,
        weatherLongitude: null,
        weatherTimezone: "",
        onboardingTipsDismissed: []
      },
      $unset: { creditedPurchaseReferences: 1, reversedCreditPurchaseReferences: 1 }
    });

    const pendingProviderActions = request.providerActions.filter((action: any) => action.status === "manual_pending");
    request.status = pendingProviderActions.length ? "provider_cleanup_pending" : "completed_with_retained_records";
    request.completedAt = pendingProviderActions.length ? null : new Date();
    request.objectKeys = [];
    await request.save();

    try {
      await sendDeletionProgressEmail({
        to: request.subjectEmail,
        reference: request.deletionReference,
        pendingProviders: pendingProviderActions.length
      });
    } catch (emailError) {
      // Deletion must not fail or retry after destructive local cleanup solely
      // because a transactional status email could not be delivered.
      logSafeError("account-deletion.progress-email", emailError);
    }

    if (!pendingProviderActions.length) {
      await User.updateOne({ _id: objectId }, { $set: { deletionStatus: "completed" } });
      request.subjectEmail = "";
      await request.save();
    }
    return request;
  } catch (error) {
    request.status = "failed";
    request.lastError = error instanceof Error ? error.message.slice(0, 240) : "Account deletion failed.";
    await request.save();
    throw error;
  }
}

export async function updateDeletionProviderAction(input: {
  requestId: string;
  provider: string;
  status: "completed" | "failed" | "not_applicable";
  evidenceReference?: string;
  error?: string;
}) {
  const request = await AccountDeletionRequest.findById(input.requestId).select("+subjectEmail +objectKeys");
  if (!request) return null;
  const action = request.providerActions.find((entry: any) => entry.provider === input.provider);
  if (!action) throw new Error("Provider cleanup action was not found.");

  action.status = input.status;
  action.completedAt = input.status === "completed" || input.status === "not_applicable" ? new Date() : null;
  action.evidenceReference = String(input.evidenceReference || "").trim().slice(0, 240);
  action.error = input.status === "failed" ? String(input.error || "Provider cleanup failed.").trim().slice(0, 240) : "";
  request.providerCleanupUpdatedAt = new Date();

  const stillPending = request.providerActions.some((entry: any) => entry.status === "manual_pending" || entry.status === "failed");
  if (stillPending) {
    request.status = "provider_cleanup_pending";
    request.completedAt = null;
    await request.save();
    return request;
  }

  const completionEmail = request.subjectEmail;
  request.status = "completed_with_retained_records";
  request.completedAt = new Date();
  request.subjectEmail = "";
  await request.save();
  await User.updateOne({ _id: request.userId }, { $set: { deletionStatus: "completed" } });

  try {
    await sendDeletionProgressEmail({
      to: completionEmail,
      reference: request.deletionReference,
      pendingProviders: 0
    });
  } catch (emailError) {
    logSafeError("account-deletion.completion-email", emailError);
  }

  return request;
}

export function serializeAccountDeletionRequest(request: any) {
  return {
    deletionRequested: true,
    status: request.status,
    requestedAt: request.requestedAt ? new Date(request.requestedAt).toISOString() : null,
    completedAt: request.completedAt ? new Date(request.completedAt).toISOString() : null,
    retainedRecords: request.retainedRecordClasses || [],
    providerCleanupPending: (request.providerActions || []).some((action: any) => action.status === "manual_pending" || action.status === "failed"),
    deletionReference: request.deletionReference || ""
  };
}
