import { MarketingFeaturePage } from "@/components/marketing/MarketingFeaturePage";
import { marketingPages } from "@/lib/marketing/site";

export function MarketingHome({ signedIn }: { signedIn: boolean }) {
  return <MarketingFeaturePage config={marketingPages.home} signedIn={signedIn} />;
}
