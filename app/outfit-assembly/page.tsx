import type { Metadata } from "next";
import { MarketingFeaturePage } from "@/components/marketing/MarketingFeaturePage";
import { getSessionUser } from "@/lib/auth";
import { marketingPages } from "@/lib/marketing/site";

export const metadata: Metadata = { title: "Outfit Assembly", description: marketingPages["outfit-assembly"].description };
export default async function OutfitAssemblyPage() { const session = await getSessionUser(); return <MarketingFeaturePage config={marketingPages["outfit-assembly"]} signedIn={Boolean(session)} />; }
