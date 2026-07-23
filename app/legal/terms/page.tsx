import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalChrome";
import { getLegalPolicy } from "@/lib/legal/policies";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using MyFitPick, managing an account, and using fashion recommendations."
};

export default function TermsPolicyPage() {
  return <LegalPage policy={getLegalPolicy("terms")} />;
}
