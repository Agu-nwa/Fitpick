import type { Metadata } from "next";
import { MarketingFeaturePage } from "@/components/marketing/MarketingFeaturePage";
import { getSessionUser } from "@/lib/auth";
import { marketingPages } from "@/lib/marketing/site";

export const metadata: Metadata = { title: "How MyFitPick Works", description: marketingPages["how-it-works"].description };
export default async function HowItWorksPage() { const session = await getSessionUser(); return <MarketingFeaturePage config={marketingPages["how-it-works"]} signedIn={Boolean(session)} />; }
