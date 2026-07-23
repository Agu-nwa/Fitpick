import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalChrome";
import { getLegalPolicy } from "@/lib/legal/policies";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How MyFitPick uses cookies and similar local technologies."
};

export default function CookiePolicyPage() {
  return <LegalPage policy={getLegalPolicy("cookies")} />;
}
