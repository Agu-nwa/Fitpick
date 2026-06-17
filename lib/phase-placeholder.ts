import { apiSuccess } from "@/lib/api-response";

export function phasePlaceholder(feature: string, phase = "Phase 5B") {
  return apiSuccess({
    ready: false,
    feature,
    phase,
    message: `${feature} is scaffolded and will be implemented in ${phase}.`
  });
}
