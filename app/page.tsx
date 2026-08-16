import type { Metadata } from "next";
import { MarketingHome } from "@/components/marketing/MarketingHome";
import { getSessionUser } from "@/lib/auth";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://myfitpick.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    absolute: "MyFitPick | AI Personal Stylist for Your Wardrobe"
  },
  description: "Know what to wear using what you already own. MyFitPick creates complete outfits for the occasion, weather and way you want to feel.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "MyFitPick",
    title: "Know what to wear, using what you already own.",
    description: "MyFitPick creates complete outfits from your wardrobe—including shoes and accessories.",
    images: [{
      url: "/marketing/myfitpick-social-share-v1.png",
      width: 1200,
      height: 630,
      alt: "MyFitPick — If Your Wardrobe Could Think"
    }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Know what to wear, using what you already own.",
    description: "MyFitPick creates complete outfits from your wardrobe—including shoes and accessories.",
    images: ["/marketing/myfitpick-social-share-v1.png"]
  }
};

export default async function Page() {
  const session = await getSessionUser();
  return <MarketingHome signedIn={Boolean(session)} />;
}
