import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalChrome";
import { getLegalPolicy } from "@/lib/legal/policies";

export const metadata: Metadata = {
  title: "AI and Virtual Try-On Disclosure",
  description: "What to expect from MyFitPick AI styling, wardrobe intelligence, and virtual try-on previews."
};

export default function AiVirtualTryOnDisclosurePage() {
  return <LegalPage policy={getLegalPolicy("ai-virtual-try-on")} />;
}
