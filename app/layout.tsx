import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClientRecovery from "@/components/system/ClientRecovery";

export const metadata: Metadata = {
  title: { default: "MyFitPick - Your AI Wardrobe", template: "%s - MyFitPick" },
  description: "Your wardrobe, styled intelligently. Build looks, preview outfits, and dress with confidence.",
  appleWebApp: {
    capable: true,
    title: "MyFitPick",
    statusBarStyle: "black-translucent",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0A09",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-canvas">
      <body className="font-sans">
        <ClientRecovery />

        <a
          href="#main-content"
          className="sr-only-fitpick focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-cocoa focus:px-4 focus:py-2 focus:text-sm"
        >
          Skip to content
        </a>

        {children}
      </body>
    </html>
  );
}
