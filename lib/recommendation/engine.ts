import { safeReasonChips } from "@/lib/recommendation/reason-chips";

export function recommendationEnginePlaceholder() {
  return {
    ready: false,
    reasonChips: safeReasonChips,
    message: "Rule-based outfit recommendations will be implemented after wardrobe APIs."
  };
}
