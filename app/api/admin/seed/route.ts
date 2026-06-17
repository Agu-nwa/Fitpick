export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { ContentRule } from "@/models/ContentRule";
import { Occasion } from "@/models/Occasion";

const globalOccasions = [
  { name: "Work", group: "everyday", formality: "polished" },
  { name: "School", group: "everyday", formality: "balanced" },
  { name: "Church", group: "cultural", formality: "polished" },
  { name: "Wedding Guest", group: "social", formality: "formal" },
  { name: "Owambe", group: "cultural", formality: "formal" },
  { name: "Native Friday", group: "cultural", formality: "balanced" },
  { name: "Business Meeting", group: "formal", formality: "polished" },
  { name: "Casual Hangout", group: "social", formality: "relaxed" },
  { name: "Rainy Day", group: "weather", formality: "balanced" },
  { name: "Hot Day", group: "weather", formality: "relaxed" }
] as const;

const reasonChips = [
  "Occasion-ready",
  "Color-balanced",
  "Weather-aware",
  "Not worn recently",
  "Comfort-first",
  "Polished finish",
  "Event-aware"
];

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (auth.user.role !== "admin") return apiError("FORBIDDEN", "Admin access is required.");

    await connectDB();

    for (const occasion of globalOccasions) {
      await Occasion.updateOne(
        { name: occasion.name, isGlobal: true },
        { $setOnInsert: { ...occasion, isGlobal: true } },
        { upsert: true }
      );
    }

    for (const chip of reasonChips) {
      await ContentRule.updateOne(
        { type: "reason_chip", key: chip.toLowerCase().replaceAll(" ", "_").replaceAll("-", "_") },
        { $set: { label: chip, active: true } },
        { upsert: true }
      );
    }

    await recordAuditEvent({ request, userId: String(auth.user._id), action: "admin.seed", entityType: "ContentRule" });

    return apiSuccess(
      { occasions: globalOccasions.length, reasonChips: reasonChips.length },
      { message: "Seed skeleton completed." }
    );
  } catch (error) {
    console.error("FitPick seed error:", error);
    return apiError("INTERNAL_ERROR", "Unable to run seed skeleton right now.");
  }
}
