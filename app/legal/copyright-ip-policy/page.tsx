import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalChrome";
import { getLegalPolicy } from "@/lib/legal/policies";

export const metadata: Metadata = {
  title: "Copyright and Intellectual Property Policy",
  description: "MyFitPick rules for uploaded content, ownership, brand references, and rights complaints."
};

export default function CopyrightIpPolicyPage() {
  return <LegalPage policy={getLegalPolicy("copyright-ip")} />;
}
