import mongoose from "mongoose";
import { getProtectedStorageUrl } from "@/lib/storage/url";
import { toSafeUser } from "@/models/User";

const userCollections = [
  "appnotifications", "avataroutfitpreviews", "avatarprofiles", "creditpurchases", "credittransactions",
  "dailyusages", "fashionmemories", "garmentassets", "notificationpreferences", "occasions", "outfitfeedbacks",
  "outfithistories", "outfitpreviews", "outfitrecommendations", "outfits", "privacypreferences",
  "privacyrequests", "progressivepromptstates", "referencefashionitems", "stylepreferences", "styleprofiles", "stylistplans",
  "tryongenerations", "wardrobecompatibilityedges", "wardrobeitems", "wardrobeuploadbatches", "wardrobeuploads", "wornlooks"
] as const;

const excludedKeys = new Set([
  "__v", "userId", "passwordHash", "activeSessionId", "creditedPurchaseReferences",
  "reversedCreditPurchaseReferences", "objectKeys", "subjectEmail", "subjectEmailHash",
  "providerJobId", "idempotencyKey", "rawPayload"
]);

function portableValue(value: unknown): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof mongoose.Types.ObjectId) return String(value);
  if (Buffer.isBuffer(value)) return "[binary data omitted]";
  if (Array.isArray(value)) return value.map(portableValue);
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (!excludedKeys.has(key)) output[key] = portableValue(entry);
    }
    return output;
  }
  return value;
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

export async function buildPersonalDataExport(user: any) {
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database is unavailable for data export.");
  const userId = String(user._id);
  const objectId = new mongoose.Types.ObjectId(userId);
  const categories: Record<string, unknown[]> = {};
  const allRecords: unknown[] = [];

  for (const collectionName of userCollections) {
    const records = await db.collection(collectionName).find({ userId: objectId }).toArray();
    categories[collectionName] = records.map((record) => portableValue(record)) as unknown[];
    allRecords.push(...records);
  }

  const auditEvents = await db.collection("auditevents").find({ userId: objectId }).sort({ createdAt: 1 }).toArray();
  categories.auditEvents = auditEvents.map((record) => portableValue(record)) as unknown[];
  allRecords.push(...auditEvents);

  const supportConversations = await db.collection("supportconversations").find({ userId: objectId }).toArray();
  const supportConversationIds = supportConversations.map((entry) => entry._id);
  const supportMessages = supportConversationIds.length
    ? await db.collection("supportmessages").find({ conversationId: { $in: supportConversationIds } }).sort({ createdAt: 1 }).toArray()
    : [];
  categories.supportConversations = supportConversations.map((record) => portableValue(record)) as unknown[];
  categories.supportMessages = supportMessages.map((record) => portableValue(record)) as unknown[];
  allRecords.push(...supportConversations, ...supportMessages);

  const externalCustomers = await db.collection("externalsupportcustomers").find({ email: String(user.email || "").toLowerCase() }).toArray();
  const externalCustomerIds = externalCustomers.map((entry) => entry._id);
  const externalConversations = externalCustomerIds.length
    ? await db.collection("externalsupportconversations").find({ customerId: { $in: externalCustomerIds } }).toArray()
    : [];
  const externalConversationIds = externalConversations.map((entry) => entry._id);
  const externalMessages = externalConversationIds.length
    ? await db.collection("externalsupportmessages").find({ conversationId: { $in: externalConversationIds } }).sort({ createdAt: 1 }).toArray()
    : [];
  categories.externalSupportCustomers = externalCustomers.map((record) => portableValue(record)) as unknown[];
  categories.externalSupportConversations = externalConversations.map((record) => portableValue(record)) as unknown[];
  categories.externalSupportMessages = externalMessages.map((record) => portableValue(record)) as unknown[];
  allRecords.push(...externalCustomers, ...externalConversations, ...externalMessages);

  const mediaFiles = Array.from(collectStorageKeys(allRecords))
    .filter((storageKey) => storageKey.startsWith(`wardrobe/${userId}/`) || storageKey.startsWith(`generated-previews/${userId}/`) || storageKey.startsWith(`avatar-previews/${userId}/`) || storageKey.startsWith(`support/${userId}/`))
    .map((storageKey) => ({ storageKey, authenticatedDownloadPath: getProtectedStorageUrl(storageKey) }));

  return {
    format: "myfitpick-personal-data-export",
    version: "1.0",
    generatedAt: new Date().toISOString(),
    account: portableValue(toSafeUser(user)),
    notice: "Media paths require authentication and are provided separately because images are not embedded in this JSON file.",
    mediaFiles,
    categories
  };
}
