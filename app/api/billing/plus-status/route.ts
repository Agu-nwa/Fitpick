export const dynamic = "force-dynamic";

import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { getPlanEntitlements } from "@/lib/entitlements";
import { billingReady, providerReadiness } from "@/lib/payments";
import { getRemainingDailyPicks } from "@/lib/usage-limits";
import { PlusSubscription } from "@/models/PlusSubscription";

export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const subscription =
      (await PlusSubscription.findOne({ userId: auth.user._id }).lean()) ||
      (await PlusSubscription.create({ userId: auth.user._id }));
    const activePlus = subscription.plan === "plus" && ["active", "trialing"].includes(subscription.status);
    const plan = activePlus ? "plus" : "free";
    const entitlements = getPlanEntitlements(plan);
    const usage = await getRemainingDailyPicks(String(auth.user._id));

    return apiSuccess({
      plan,
      provider: subscription.provider || "none",
      status: subscription.status,
      currency: subscription.currency || "USD",
      amount: subscription.amount || 0,
      interval: subscription.interval || "month",
      currentPeriodEnd: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toISOString() : null,
      limits: entitlements.limits,
      usageToday: usage.usageToday,
      remainingDailyPicks: usage.remainingDailyPicks,
      features: entitlements.features,
      billingReady: billingReady(),
      availableProviders: providerReadiness()
    });
  } catch (error) {
    console.error("FitPick plus status error:", error);
    return apiError("INTERNAL_ERROR", "Unable to load Plus status right now.");
  }
}
