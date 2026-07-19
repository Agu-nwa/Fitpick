export const dynamic = "force-dynamic";

import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { alwaysFreeFeatures, serializeCreditCosts } from "@/lib/credits/credit-costs";
import { getCreditHistory } from "@/lib/credits/credit-history";
import { getOrCreateCreditWallet } from "@/lib/credits/credit-wallet";
import { paymentOverview } from "@/lib/payments";
import { listUserPurchases } from "@/lib/payments/purchases";
import { logSafeError } from "@/lib/security/safe-log";

export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const [wallet, transactions, purchases] = await Promise.all([
      getOrCreateCreditWallet(auth.user._id),
      getCreditHistory(String(auth.user._id)),
      listUserPurchases(auth.user._id)
    ]);

    return apiSuccess({
      wallet,
      transactions,
      usageHistory: transactions,
      costs: serializeCreditCosts(),
      freeFeatures: alwaysFreeFeatures,
      purchases,
      ...paymentOverview()
    });
  } catch (error) {
    logSafeError("wallet.get", error);
    return apiError("INTERNAL_ERROR", "Unable to load your credit wallet right now.");
  }
}
