import crypto from "node:crypto";
import mongoose from "mongoose";
import { deleteStoredObject, storageKeyBelongsToUser } from "@/lib/storage";
import { AccountDeletionRequest } from "@/models/AccountDeletionRequest";
import { BackgroundJob } from "@/models/BackgroundJob";
import { User } from "@/models/User";

const deletableCollections = [
  "appnotifications", "avataroutfitpreviews", "avatarprofiles", "dailyusages", "fashionmemories",
  "garmentassets", "notificationpreferences", "occasions", "outfits", "outfitfeedbacks", "outfithistories",
  "outfitpreviews", "outfitrecommendations", "privacypreferences", "progressivepromptstates",
  "referencefashionitems", "stylepreferences", "styleprofiles", "tryongenerations", "wardrobecompatibilityedges",
  "wardrobeitems", "wardrobeuploads", "wornlooks"
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
  const sources = ["avatarprofiles", "wardrobeitems", "wardrobeuploads", "garmentassets", "referencefashionitems", "outfitpreviews", "avataroutfitpreviews", "outfitrecommendations", "tryongenerations"];
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
  return Array.from(keys).filter((key) => isOwnedDeletionKey(userId, key));
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
    if (request.subjectEmail) {
      await db.collection("emailotps").deleteMany({ email: request.subjectEmail.toLowerCase() });
      await db.collection("externalsupportcustomers").updateMany(
        { email: request.subjectEmail.toLowerCase() },
        { $set: { email: `deleted+${request.deletionReference}@invalid.local`, name: "Deleted user" } }
      );
    }

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
    await request.save();

    await User.updateOne({ _id: objectId }, {
      $set: {
        name: "Deleted user",
        email: `deleted+${request.deletionReference}@invalid.local`,
        avatarUrl: "",
        passwordHash: "",
        activeSessionId: "",
        deletionStatus: "completed",
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

    request.status = "completed_with_retained_records";
    request.completedAt = new Date();
    request.subjectEmail = "";
    request.objectKeys = [];
    await request.save();
    return request;
  } catch (error) {
    request.status = "failed";
    request.lastError = error instanceof Error ? error.message.slice(0, 240) : "Account deletion failed.";
    await request.save();
    throw error;
  }
}

export function serializeAccountDeletionRequest(request: any) {
  return {
    deletionRequested: true,
    status: request.status,
    requestedAt: request.requestedAt ? new Date(request.requestedAt).toISOString() : null,
    completedAt: request.completedAt ? new Date(request.completedAt).toISOString() : null,
    retainedRecords: request.retainedRecordClasses || []
  };
}
