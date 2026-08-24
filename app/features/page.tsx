import type { Metadata } from "next";
import { MarketingFeaturePage } from "@/components/marketing/MarketingFeaturePage";
import { getSessionUser } from "@/lib/auth";
import { marketingPages } from "@/lib/marketing/site";

export const metadata: Metadata = { title: "MyFitPick Features", description: marketingPages.features.description };
export default async function FeaturesPage() { const session = await getSessionUser(); return <MarketingFeaturePage config={marketingPages.features} signedIn={Boolean(session)} />; }
