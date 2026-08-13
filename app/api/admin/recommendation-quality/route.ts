export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/admin";
import { computeRecommendationQuality } from "@/lib/recommendation/quality";
import { logSafeError } from "@/lib/security/safe-log";
import { OutfitHistory } from "@/models/OutfitHistory";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const requestedDays = Number(request.nextUrl.searchParams.get("days") || 30);
    const days = Number.isFinite(requestedDays) ? Math.max(1, Math.min(Math.round(requestedDays), 180)) : 30;
    const since = new Date(Date.now() - days * 86_400_000);
    const rows = await OutfitHistory.aggregate([
      { $match: { generatedAt: { $gte: since } } },
      { $lookup: { from: "outfitrecommendations", localField: "outfitId", foreignField: "_id", as: "recommendation" } },
      { $unwind: { path: "$recommendation", preserveNullAndEmptyArrays: true } },
      { $project: {
        confidenceScore: "$recommendation.confidenceScore",
        completenessStatus: "$recommendation.completenessStatus",
        footwearIncluded: "$recommendation.footwearIncluded",
        viewedAt: 1,
        savedAt: 1,
        acceptedAt: 1,
        rejectedAt: 1,
        wornAt: 1,
        swappedAt: 1,
        recommendationMode: 1,
        occasion: 1
      } }
    ]);
    const metrics = computeRecommendationQuality(rows);
    const groupMetrics = (field: "recommendationMode" | "occasion") => Object.fromEntries(
      Array.from(new Set(rows.map((row) => String(row[field] || "unknown")))).map((value) => [
        value,
        computeRecommendationQuality(rows.filter((row) => String(row[field] || "unknown") === value))
      ])
    );
    return apiSuccess({
      window: { days, since: since.toISOString(), generatedCount: rows.length },
      metrics,
      byRecommendationMode: groupMetrics("recommendationMode"),
      byOccasion: groupMetrics("occasion")
    });
  } catch (error) {
    logSafeError("admin.recommendation-quality", error);
    return apiError("INTERNAL_ERROR", "Unable to load recommendation quality right now.");
  }
}
