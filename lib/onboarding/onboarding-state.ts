import { OutfitRecommendation } from "@/models/OutfitRecommendation";
import { ReferenceFashionItem } from "@/models/ReferenceFashionItem";
import { TryOnGeneration } from "@/models/TryOnGeneration";
import { User, type UserDocument } from "@/models/User";
import { WardrobeItem } from "@/models/WardrobeItem";
import type { GettingStartedTask, OnboardingState, OnboardingTipId } from "@/types/onboarding";

const checklistDismissAfterMs = 3 * 24 * 60 * 60 * 1000;

function iso(value?: Date | null) {
  return value ? value.toISOString() : null;
}

function validTipId(value: string): value is OnboardingTipId {
  return ["closet", "create-look", "match-outfit", "virtual-try-on"].includes(value);
}

async function firstDate<T extends { createdAt?: Date }>(promise: Promise<T | null>) {
  const record = await promise;
  return record?.createdAt || null;
}

export async function getOnboardingState(user: UserDocument): Promise<OnboardingState> {
  const userId = user._id;
  const [firstWardrobeItemAt, firstCreateLookAt, firstMatchAt, firstTryOnAt] = await Promise.all([
    firstDate(WardrobeItem.findOne({ userId, archivedAt: null }).sort({ createdAt: 1 }).select("createdAt").lean<{ createdAt?: Date }>()),
    firstDate(OutfitRecommendation.findOne({ userId, source: { $in: ["outfit_page", "stylist_chat", "rule_based", "ai"] } }).sort({ createdAt: 1 }).select("createdAt").lean<{ createdAt?: Date }>()),
    firstDate(ReferenceFashionItem.findOne({ userId, status: { $in: ["ready", "needs-selection", "converted_to_wardrobe"] } }).sort({ createdAt: 1 }).select("createdAt").lean<{ createdAt?: Date }>()),
    firstDate(TryOnGeneration.findOne({ userId, status: "completed" }).sort({ createdAt: 1 }).select("createdAt").lean<{ createdAt?: Date }>())
  ]);

  const tasks: GettingStartedTask[] = [
    { id: "upload-first-item", title: "Upload your first clothing item", href: "/wardrobe/add", completed: Boolean(firstWardrobeItemAt), completedAt: iso(firstWardrobeItemAt) },
    { id: "create-first-look", title: "Create your first look", href: "/stylist/create-look", completed: Boolean(firstCreateLookAt), completedAt: iso(firstCreateLookAt) },
    { id: "match-first-item", title: "Match an item with your wardrobe", href: "/stylist/match", completed: Boolean(firstMatchAt), completedAt: iso(firstMatchAt) },
    { id: "generate-first-tryon", title: "Generate your first Virtual Try-On", href: "/stylist/create-look", completed: Boolean(firstTryOnAt), completedAt: iso(firstTryOnAt) }
  ];

  const completedCount = tasks.filter((task) => task.completed).length;
  const allComplete = completedCount === tasks.length;
  const checklistDismissedAt = user.onboardingChecklistDismissedAt || null;
  const autoHideCompleted = allComplete && tasks.every((task) => task.completedAt && Date.now() - new Date(task.completedAt).getTime() > checklistDismissAfterMs);

  return {
    welcomeCompleted: Boolean(user.onboardingWelcomeCompletedAt),
    welcomeCompletedAt: iso(user.onboardingWelcomeCompletedAt),
    checklistDismissedAt: iso(checklistDismissedAt),
    dismissedTips: (user.onboardingTipsDismissed || []).filter(validTipId),
    tasks,
    completedCount,
    totalCount: tasks.length,
    allComplete,
    shouldShowChecklist: !checklistDismissedAt && !autoHideCompleted
  };
}

export async function markWelcomeComplete(user: UserDocument) {
  if (!user.onboardingWelcomeCompletedAt) {
    await User.updateOne({ _id: user._id, onboardingWelcomeCompletedAt: null }, { $set: { onboardingWelcomeCompletedAt: new Date() } });
  }
  const fresh = await User.findById(user._id).orFail();
  return getOnboardingState(fresh);
}

export async function dismissChecklist(user: UserDocument) {
  await User.updateOne({ _id: user._id }, { $set: { onboardingChecklistDismissedAt: new Date() } });
  const fresh = await User.findById(user._id).orFail();
  return getOnboardingState(fresh);
}

export async function dismissOnboardingTip(user: UserDocument, tipId: OnboardingTipId) {
  const dismissed = new Set((user.onboardingTipsDismissed || []).filter(validTipId));
  dismissed.add(tipId);
  await User.updateOne({ _id: user._id }, { $set: { onboardingTipsDismissed: Array.from(dismissed) } });
  const fresh = await User.findById(user._id).orFail();
  return getOnboardingState(fresh);
}
