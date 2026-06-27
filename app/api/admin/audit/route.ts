export const dynamic = "force-dynamic";

import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/admin";
import { logSafeError } from "@/lib/security/safe-log";
import { AuditEvent } from "@/models/AuditEvent";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const [recent, summary] = await Promise.all([
      AuditEvent.find({})
        .sort({ createdAt: -1 })
        .limit(50)
        .select("action entityType entityId createdAt")
        .lean(),
      AuditEvent.aggregate([
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    return apiSuccess({
      recent: recent.map((event) => ({
        id: String(event._id),
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        createdAt: event.createdAt?.toISOString()
      })),
      summary: summary.map((row) => ({ action: row._id, count: row.count }))
    });
  } catch (error) {
    logSafeError("admin.audit", error);
    return apiError("INTERNAL_ERROR", "Unable to load audit summary right now.");
  }
}
