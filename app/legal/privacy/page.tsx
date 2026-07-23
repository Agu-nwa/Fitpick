import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalChrome";
import { getLegalPolicy } from "@/lib/legal/policies";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How MyFitPick handles account, wardrobe, style, Credits, and preview information."
};

export default function PrivacyPolicyPage() {
  return <LegalPage policy={getLegalPolicy("privacy")} />;
}
