import { apiSuccess } from "@/lib/api-response";
import { billingReady, providerReadiness } from "@/lib/payments";

export async function GET() {
  return apiSuccess({
    billingReady: billingReady(),
    providers: providerReadiness()
  });
}
