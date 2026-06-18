export const dynamic = "force-dynamic";

import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/admin";
import { ContentRule } from "@/models/ContentRule";
import { Occasion } from "@/models/Occasion";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const [rules, occasions] = await Promise.all([
      ContentRule.aggregate([
        { $match: { active: true } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Occasion.find({ isGlobal: true }).select("name group formality").sort({ group: 1, name: 1 }).lean()
    ]);

    return apiSuccess({
      contentRuleSummary: rules.map((rule) => ({ type: rule._id, count: rule.count })),
      occasions: occasions.map((occasion) => ({
        id: String(occasion._id),
        name: occasion.name,
        group: occasion.group,
        formality: occasion.formality
      }))
    });
  } catch (error) {
    console.error("FitPick admin content error:", error);
    return apiError("INTERNAL_ERROR", "Unable to load content summary right now.");
  }
}
