import type { Metadata } from "next";
import { LegalCenter } from "@/components/legal/LegalChrome";

export const metadata: Metadata = {
  title: "Legal Policy Center",
  description: "MyFitPick policies for privacy, terms, Credits, AI previews, refunds, cookies, and rights."
};

export default function LegalPage() {
  return <LegalCenter />;
}
