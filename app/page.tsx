import type { Metadata } from "next";
import { MarketingHome } from "@/components/marketing/MarketingHome";
import { getSessionUser } from "@/lib/auth";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://myfitpick.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    absolute: "MyFitPick | AI Personal Stylist for Your Wardrobe"
  },
  description: "Turn the clothes you already own into complete outfits with AI styling, Match an Outfit, and optional Virtual Try-On previews.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "MyFitPick",
    title: "Your closet. Styled intelligently.",
    description: "An AI-powered personal stylist that turns the clothes you already own into complete outfits.",
    images: [{ url: "/marketing/myfitpick-wardrobe-could-think-ad.png", width: 1092, height: 1440, alt: "MyFitPick AI personal stylist" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Your closet. Styled intelligently.",
    description: "An AI-powered personal stylist that turns the clothes you already own into complete outfits.",
    images: ["/marketing/myfitpick-wardrobe-could-think-ad.png"]
  }
};

export default async function Page() {
  const session = await getSessionUser();
  return <MarketingHome signedIn={Boolean(session)} />;
}
