import type { NextRequest } from "next/server";
import { AuditEvent } from "@/models/AuditEvent";

export type AuditAction =
  | "auth.register"
  | "auth.login"
  | "auth.logout"
  | "user.update"
  | "preferences.update"
  | "admin.seed"
  | "wardrobe.upload"
  | "wardrobe.delete"
  | "billing.change";

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
    console.warn("Audit event was not recorded.", error);
  }
}
