export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api-response";
import { paymentOverview } from "@/lib/payments";
import { isIosAppStoreRequest } from "@/lib/payments/ios-request";

export async function GET(request: NextRequest) {
  const overview = paymentOverview();
  if (!isIosAppStoreRequest(request)) return apiSuccess(overview);
  return apiSuccess({
    ...overview,
    paymentsReady: overview.providers.appStore.configured,
    providers: { appStore: overview.providers.appStore },
    usdtNetworks: []
  });
}
