import { apiSuccess } from "@/lib/api-response";
import { recommendationEnginePlaceholder } from "@/lib/recommendation/engine";

export async function POST() {
  return apiSuccess({
    ready: false,
    engine: recommendationEnginePlaceholder()
  });
}
