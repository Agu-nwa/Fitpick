import type { Metadata } from "next";
import { MarketingFeaturePage } from "@/components/marketing/MarketingFeaturePage";
import { getSessionUser } from "@/lib/auth";
import { marketingPages } from "@/lib/marketing/site";

export const metadata: Metadata = { title: "AI Stylist", description: marketingPages["ai-stylist"].description };
export default async function AIStylistPage() { const session = await getSessionUser(); return <MarketingFeaturePage config={marketingPages["ai-stylist"]} signedIn={Boolean(session)} />; }
