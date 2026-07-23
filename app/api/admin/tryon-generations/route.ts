export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/admin";
import { serializeTryOnGeneration } from "@/lib/tryon/tryon-generation";
import { logSafeError } from "@/lib/security/safe-log";
import { TryOnGeneration } from "@/models/TryOnGeneration";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const status = String(searchParams.get("status") || "").trim();
    const limit = Math.max(1, Math.min(Number(searchParams.get("limit") || 50), 100));
    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    const generations = await TryOnGeneration.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select("generationId userId outfitId avatarProfileId previewId provider providerJobId status failureStage failureCode failureMessage previewUrl storageKey creditsReserved creditsCommitted creditsReleased retryCount durationMs startedAt completedAt updatedAt")
      .lean();

    const summary = await TryOnGeneration.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    return apiSuccess({
      generations: generations.map(serializeTryOnGeneration),
      summary: summary.map((row) => ({ status: row._id, count: row.count }))
    });
  } catch (error) {
    logSafeError("admin.tryon-generations", error);
    return apiError("INTERNAL_ERROR", "Unable to load try-on diagnostics right now.");
  }
}
