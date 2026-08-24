"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const consentKey = "fitpick_analytics_consent_v1";
type AnalyticsConsent = "accepted" | "declined" | "unknown";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function storedConsent(): AnalyticsConsent {
  if (typeof window === "undefined") return "unknown";
  const value = window.localStorage.getItem(consentKey);
  return value === "accepted" || value === "declined" ? value : "unknown";
}

export default function PrivacySafeAnalytics() {
  const pathname = usePathname();
  const configuredId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";
  const measurementId = /^G-[A-Z0-9]+$/i.test(configuredId) ? configuredId : "";
  const [consent, setConsent] = useState<AnalyticsConsent>("unknown");
  const [loaded, setLoaded] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setConsent(storedConsent());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (consent !== "accepted" || !loaded || !measurementId || !window.gtag) return;
    // Track only the route path. Query strings can contain upload, referral, or
    // internal record identifiers and must never be sent to analytics.
    window.gtag("event", "page_view", {
      page_path: pathname,
      page_location: `${window.location.origin}${pathname}`,
      send_to: measurementId
    });
  }, [consent, loaded, measurementId, pathname]);

  function choose(next: Exclude<AnalyticsConsent, "unknown">) {
    window.localStorage.setItem(consentKey, next);
    setConsent(next);
  }

  if (!measurementId) return null;

  return (
    <>
      {consent === "accepted" ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`} strategy="afterInteractive" />
          <Script
            id="fitpick-google-analytics"
            strategy="afterInteractive"
            onLoad={() => setLoaded(true)}
          >
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${measurementId.replace(/[^A-Za-z0-9_-]/g, "")}',{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,anonymize_ip:true});`}
          </Script>
        </>
      ) : null}

      {hydrated && consent === "unknown" ? (
        <aside className="fixed inset-x-4 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[90] mx-auto max-w-xl rounded-[24px] border border-line bg-surface/95 p-4 shadow-card backdrop-blur-xl md:bottom-6">
          <p className="text-sm font-semibold text-ink">Help improve MyFitPick?</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Optional analytics tells us how many people visit and which pages are useful. We do not send your name, email, wardrobe photos, clothing details, or URL query information.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => choose("accepted")} className="focus-ring min-h-10 rounded-full bg-cocoa px-4 text-xs font-semibold text-canvas">Allow analytics</button>
            <button type="button" onClick={() => choose("declined")} className="focus-ring min-h-10 rounded-full border border-line bg-white/80 px-4 text-xs font-semibold text-ink">No thanks</button>
            <Link href="/legal/cookie-policy" className="focus-ring inline-flex min-h-10 items-center px-2 text-xs font-semibold text-olive">Cookie policy</Link>
          </div>
        </aside>
      ) : null}
    </>
  );
}
