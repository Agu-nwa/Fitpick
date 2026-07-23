import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalChrome";
import { getLegalPolicy } from "@/lib/legal/policies";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "How MyFitPick reviews Credit purchase issues, failed paid actions, and refund requests."
};

export default function RefundPolicyPage() {
  return <LegalPage policy={getLegalPolicy("refund")} />;
}
