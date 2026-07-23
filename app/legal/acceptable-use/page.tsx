import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalChrome";
import { getLegalPolicy } from "@/lib/legal/policies";

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
  description: "The standards for using MyFitPick respectfully, lawfully, and safely."
};

export default function AcceptableUsePolicyPage() {
  return <LegalPage policy={getLegalPolicy("acceptable-use")} />;
}
