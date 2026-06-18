export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/admin";
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
  { name: "Traditional Event", group: "cultural", formality: "formal" },
  { name: "Interview", group: "formal", formality: "formal" },
  { name: "Date/Social Outing", group: "social", formality: "balanced" },
  { name: "Travel", group: "everyday", formality: "balanced" },
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
  "Event-aware",
  "Ready to wear"
];

const contentRules = [
  {
    type: "wardrobe_category",
    entries: [
      ["tops", "Tops"],
      ["bottoms", "Bottoms"],
      ["dresses", "Dresses"],
      ["native", "Native/traditional"],
      ["outerwear", "Outerwear"],
      ["shoes", "Shoes"],
      ["bags", "Bags"],
      ["accessories", "Accessories"],
      ["care_missing_item", "Care/missing item"]
    ]
  },
  {
    type: "category_subtype",
    entries: [
      ["shirt", "Shirt"],
      ["t_shirt", "T-shirt"],
      ["blouse", "Blouse"],
      ["jeans", "Jeans"],
      ["trousers", "Trousers"],
      ["skirt", "Skirt"],
      ["gown", "Gown"],
      ["ankara", "Ankara"],
      ["senator", "Senator wear"],
      ["kaftan", "Kaftan"],
      ["agbada", "Agbada"],
      ["lace", "Lace"],
      ["sneakers", "Sneakers"],
      ["sandals", "Sandals"],
      ["watch", "Watch"]
    ]
  },
  {
    type: "style_tag",
    entries: [
      ["minimal", "Minimal"],
      ["clean_simple", "clean-simple"],
      ["polished", "polished"],
      ["streetwear", "Streetwear"],
      ["elegant", "elegant"],
      ["bold", "bold"],
      ["traditional", "traditional"],
      ["sporty", "sporty"],
      ["mixed", "mixed"]
    ]
  },
  {
    type: "formality_tag",
    entries: [
      ["relaxed", "Relaxed"],
      ["balanced", "Balanced"],
      ["polished", "Polished"],
      ["formal", "Formal"],
      ["ceremonial", "Ceremonial"],
      ["traditional", "Traditional"]
    ]
  },
  {
    type: "weather_tag",
    entries: [
      ["hot", "hot"],
      ["rainy", "rainy"],
      ["cold", "cold"],
      ["humid", "humid"],
      ["dry", "dry"],
      ["outdoor", "outdoor"],
      ["travel_ready", "travel-ready"]
    ]
  },
  {
    type: "condition_tag",
    entries: [
      ["ready", "ready"],
      ["needs_care", "needs-care"],
      ["missing_tags", "missing-tags"]
    ]
  },
  {
    type: "occasion_tag",
    entries: [
      ["work", "Work"],
      ["school", "School"],
      ["church", "Church"],
      ["wedding", "Wedding"],
      ["owambe", "Owambe"],
      ["traditional_event", "Traditional event"],
      ["interview", "Interview"],
      ["date_social_outing", "Date/social outing"],
      ["casual_hangout", "Casual hangout"],
      ["travel", "Travel"],
      ["rainy_day", "Rainy day"],
      ["hot_day", "Hot day"],
      ["native_friday", "Native Friday"],
      ["business_meeting", "Business meeting"]
    ]
  },
  {
    type: "premium_prompt",
    entries: [
      ["daily_pick_limit", "You have used today’s free outfit picks. FitPick Plus unlocks more outfit options."],
      ["advanced_swap_locked", "FitPick Plus adds more swap options when you want extra styling range."],
      ["travel_feature_locked", "Travel planning is available with FitPick Plus."],
      ["event_planning_locked", "Event planning is available with FitPick Plus."],
      ["soft_plus_reminder", "FitPick Plus gives you more outfit memory and planning tools."]
    ]
  },
  {
    type: "notification_template",
    entries: [
      ["morning_outfit_reminder", "Ready to pick today’s outfit?"],
      ["weather_change", "Weather changed. Review today’s outfit options."],
      ["event_prep", "You have an event coming up. Plan a look ahead."],
      ["wardrobe_completion", "Add a few more items to improve recommendations."],
      ["repeat_warning", "You wore this recently. Try a fresh option."],
      ["saved_look_reminder", "A saved look may work for today."]
    ]
  },
  {
    type: "state_template",
    entries: [
      ["wardrobe_empty", "Add wardrobe items to start getting outfit picks."],
      ["no_shoes", "Add shoes to improve outfit completion."],
      ["no_saved_looks", "Saved looks will appear here."],
      ["upload_failed", "Upload did not complete. Please try again."],
      ["image_unclear", "This image may need manual tag review."],
      ["recommendation_failed", "We could not create a recommendation right now."],
      ["permission_denied", "Please sign in to continue."],
      ["premium_locked", "This Plus feature is available when you upgrade."]
    ]
  }
] as const;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

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

    let contentRuleCount = reasonChips.length;

    for (const group of contentRules) {
      for (const [key, label] of group.entries) {
        await ContentRule.updateOne(
          { type: group.type, key },
          { $set: { label, active: true, metadata: { source: "phase-5e-seed" } } },
          { upsert: true }
        );
        contentRuleCount += 1;
      }
    }

    await recordAuditEvent({ request, userId: String(auth.user._id), action: "admin.seed", entityType: "ContentRule" });

    return apiSuccess(
      { occasions: globalOccasions.length, reasonChips: reasonChips.length, contentRules: contentRuleCount },
      { message: "Seed skeleton completed." }
    );
  } catch (error) {
    console.error("FitPick seed error:", error);
    return apiError("INTERNAL_ERROR", "Unable to run seed skeleton right now.");
  }
}
