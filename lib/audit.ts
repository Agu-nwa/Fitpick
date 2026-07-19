import type { NextRequest } from "next/server";
import { logSafeError } from "@/lib/security/safe-log";
import { AuditEvent } from "@/models/AuditEvent";

export type AuditAction =
  | "auth.register"
  | "auth.login"
  | "auth.otp.signup.request"
  | "auth.otp.signup.verify"
  | "auth.otp.signin.request"
  | "auth.otp.signin.verify"
  | "auth.logout"
  | "user.update"
  | "preferences.update"
  | "admin.seed"
  | "wardrobe.upload"
  | "wardrobe.upload.suggest_tags"
  | "wardrobe.create"
  | "wardrobe.update"
  | "wardrobe.tags.review"
  | "wardrobe.upload.review"
  | "wardrobe.archive"
  | "wardrobe.delete"
  | "outfit.recommend"
  | "outfit.swap"
  | "outfit.save"
  | "outfit.wear"
  | "outfit.feedback"
  | "looks.create"
  | "looks.update"
  | "looks.delete"
  | "payment.checkout"
  | "payment.refund"
  | "payment.reconcile"
  | "notifications.update"
  | "privacy.update"
  | "account.delete_request"
  | "storage.signed_upload"
  | "storage.signed_view";

export function requestMeta(request: NextRequest) {
  return {
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown",
    userAgent: request.headers.get("user-agent") || "unknown"
  };
}

export async function recordAuditEvent(input: {
  request: NextRequest;
  userId?: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
}) {
  try {
    const meta = requestMeta(input.request);

    await AuditEvent.create({
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      ip: meta.ip,
      userAgent: meta.userAgent
    });
  } catch (error) {
    logSafeError("audit.record", error, { action: input.action, entityType: input.entityType });
  }
}
