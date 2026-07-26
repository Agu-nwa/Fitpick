import { Types } from "mongoose";
import { logSafeError } from "@/lib/security/safe-log";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { AppNotification } from "@/models/AppNotification";
import { NotificationPreference } from "@/models/NotificationPreference";
import { User } from "@/models/User";

type NotificationInput = {
  userId: string | Types.ObjectId;
  type: "virtual_tryon_ready" | "virtual_tryon_failed";
  title: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
  entityType?: string;
  entityId?: string;
  dedupeKey: string;
  metadata?: Record<string, unknown>;
  sendEmail?: boolean;
};

function cleanText(value: unknown, max = 240) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanActionUrl(value: unknown) {
  const url = cleanText(value, 240);
  if (!url.startsWith("/")) return "";
  if (url.startsWith("//")) return "";
  return url;
}

function publicBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "https://myfitpick.com").replace(/\/+$/, "");
}

function transactionalEmailEnabled() {
  return process.env.ENABLE_TRYON_EMAIL_NOTIFICATIONS === "true";
}

export function serializeAppNotification(notification: any) {
  return {
    id: String(notification._id || ""),
    type: notification.type || "",
    title: notification.title || "",
    body: notification.body || "",
    actionLabel: notification.actionLabel || "",
    actionUrl: notification.actionUrl || "",
    entityType: notification.entityType || "",
    entityId: notification.entityId || "",
    readAt: notification.readAt ? new Date(notification.readAt).toISOString() : null,
    seenAt: notification.seenAt ? new Date(notification.seenAt).toISOString() : null,
    createdAt: notification.createdAt ? new Date(notification.createdAt).toISOString() : null
  };
}

async function maybeSendTryOnEmail(notification: any, input: NotificationInput) {
  if (!input.sendEmail || !transactionalEmailEnabled()) {
    await AppNotification.updateOne({ _id: notification._id }, { $set: { emailStatus: "skipped" } });
    return;
  }

  try {
    const [user, preferences] = await Promise.all([
      User.findById(input.userId).select("email name").lean(),
      NotificationPreference.findOne({ userId: input.userId }).lean()
    ]);
    if (!user?.email || preferences?.tryOnUpdates === false) {
      await AppNotification.updateOne({ _id: notification._id }, { $set: { emailStatus: "skipped" } });
      return;
    }

    const actionUrl = input.actionUrl ? `${publicBaseUrl()}${input.actionUrl}` : publicBaseUrl();
    await sendTransactionalEmail({
      to: user.email,
      subject: input.title,
      text: [input.title, "", input.body, "", actionUrl].filter(Boolean).join("\n"),
      html: `
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#171514;max-width:560px;margin:0 auto;padding:24px">
          <p style="font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#557C78">MyFitPick</p>
          <h1 style="font-size:24px;margin:8px 0 16px">${input.title}</h1>
          <p style="font-size:15px;color:#5f5a55">${input.body}</p>
          <p style="margin-top:24px">
            <a href="${actionUrl}" style="display:inline-block;border-radius:999px;background:#557C78;color:#fff;text-decoration:none;padding:12px 20px;font-weight:700">
              ${input.actionLabel || "Open MyFitPick"}
            </a>
          </p>
        </div>
      `
    });
    await AppNotification.updateOne({ _id: notification._id }, { $set: { emailStatus: "sent", emailAttemptedAt: new Date() } });
  } catch (error) {
    await AppNotification.updateOne({ _id: notification._id }, { $set: { emailStatus: "failed", emailAttemptedAt: new Date() } });
    logSafeError("notifications.email", error);
  }
}

export async function createAppNotification(input: NotificationInput) {
  const update = {
    $setOnInsert: {
      userId: input.userId,
      type: input.type,
      title: cleanText(input.title, 120),
      body: cleanText(input.body),
      actionLabel: cleanText(input.actionLabel, 80),
      actionUrl: cleanActionUrl(input.actionUrl),
      entityType: cleanText(input.entityType, 80),
      entityId: cleanText(input.entityId, 120),
      dedupeKey: cleanText(input.dedupeKey, 180),
      metadata: input.metadata || {},
      emailStatus: "not_requested"
    }
  };

  const notification = await AppNotification.findOneAndUpdate(
    { userId: input.userId, dedupeKey: input.dedupeKey },
    update,
    { upsert: true, new: true }
  );

  if (notification.emailStatus === "not_requested") {
    void maybeSendTryOnEmail(notification, input);
  }

  return notification;
}

export async function createTryOnReadyNotification(input: {
  userId: string | Types.ObjectId;
  outfitId: string | Types.ObjectId;
  generationId: string;
  previewId?: string | Types.ObjectId | null;
}) {
  return createAppNotification({
    userId: input.userId,
    type: "virtual_tryon_ready",
    title: "Your Virtual Try-On is ready.",
    body: "Your preview has been created and saved.",
    actionLabel: "View Preview",
    actionUrl: `/outfit/${String(input.outfitId)}/preview`,
    entityType: "TryOnGeneration",
    entityId: input.generationId,
    dedupeKey: `tryon-ready:${input.generationId}`,
    metadata: { outfitId: String(input.outfitId), previewId: String(input.previewId || "") },
    sendEmail: true
  });
}

export async function createTryOnFailedNotification(input: {
  userId: string | Types.ObjectId;
  outfitId: string | Types.ObjectId;
  generationId: string;
}) {
  return createAppNotification({
    userId: input.userId,
    type: "virtual_tryon_failed",
    title: "Virtual Try-On could not be completed.",
    body: "Your Credits were not deducted. You can try again when you are ready.",
    actionLabel: "Try Again",
    actionUrl: `/outfit/${String(input.outfitId)}/preview`,
    entityType: "TryOnGeneration",
    entityId: input.generationId,
    dedupeKey: `tryon-failed:${input.generationId}`,
    metadata: { outfitId: String(input.outfitId) },
    sendEmail: false
  });
}
