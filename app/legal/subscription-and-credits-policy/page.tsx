import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalChrome";
import { getLegalPolicy } from "@/lib/legal/policies";

export const metadata: Metadata = {
  title: "Subscription and Credits Policy",
  description: "How MyFitPick Credits work and when paid actions are charged."
};

export default function SubscriptionAndCreditsPolicyPage() {
  return <LegalPage policy={getLegalPolicy("subscription-and-credits")} />;
}
