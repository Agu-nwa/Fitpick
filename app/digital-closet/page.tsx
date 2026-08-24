import type { Metadata } from "next";
import { MarketingFeaturePage } from "@/components/marketing/MarketingFeaturePage";
import { getSessionUser } from "@/lib/auth";
import { marketingPages } from "@/lib/marketing/site";

export const metadata: Metadata = { title: "Digital Closet", description: marketingPages["digital-closet"].description };
export default async function DigitalClosetPage() { const session = await getSessionUser(); return <MarketingFeaturePage config={marketingPages["digital-closet"]} signedIn={Boolean(session)} />; }
