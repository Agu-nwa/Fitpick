export const dynamic = "force-dynamic";

import { apiSuccess } from "@/lib/api-response";
import { parseUsdtNetworks } from "@/lib/payments/providers/coinpayments";

export async function GET() {
  return apiSuccess({
    networks: parseUsdtNetworks().map((network) => ({
      id: network.id,
      displayName: network.displayName,
      asset: network.asset,
      network: network.network,
      estimatedFee: network.estimatedFee,
      availability: network.availability
    }))
  });
}
