"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const consentKey = "fitpick_analytics_consent_v1";
const openPreferencesEvent = "fitpick:open-cookie-preferences";
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

function clearAnalyticsCookies() {
  const cookieNames = document.cookie.split(";").map((entry) => entry.split("=")[0]?.trim()).filter((name) => name && (name === "_ga" || name === "_gid" || name === "_gat" || name.startsWith("_ga_")));
  const hostParts = window.location.hostname.split(".");
  const domains = ["", window.location.hostname, hostParts.length > 1 ? `.${hostParts.slice(-2).join(".")}` : ""].filter((value, index, values) => values.indexOf(value) === index);
  for (const name of cookieNames) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${domain ? `; domain=${domain}` : ""}`;
    }
  }
}

export default function PrivacySafeAnalytics() {
  const pathname = usePathname();
  const configuredId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";
  const measurementId = /^G-[A-Z0-9]+$/i.test(configuredId) ? configuredId : "";
  const [consent, setConsent] = useState<AnalyticsConsent>("unknown");
  const [loaded, setLoaded] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [preferenceOpen, setPreferenceOpen] = useState(false);

  useEffect(() => {
    setConsent(storedConsent());
    setHydrated(true);
  }, []);

  useEffect(() => {
    const open = () => setPreferenceOpen(true);
    window.addEventListener(openPreferencesEvent, open);
    return () => window.removeEventListener(openPreferencesEvent, open);
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
    if (next === "declined") {
      window.gtag?.("consent", "update", { analytics_storage: "denied" });
      clearAnalyticsCookies();
      setLoaded(false);
    }
    setConsent(next);
    setPreferenceOpen(false);
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

      {hydrated && (consent === "unknown" || preferenceOpen) ? (
        <aside role="dialog" aria-modal="true" aria-labelledby="cookie-preferences-title" className="fixed inset-x-4 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[90] mx-auto max-w-xl rounded-[24px] border border-line bg-surface/95 p-4 shadow-card backdrop-blur-xl md:bottom-6">
          <p id="cookie-preferences-title" className="text-sm font-semibold text-ink">Cookie and analytics choices</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Optional analytics tells us how many people visit and which pages are useful. We do not send your name, email, wardrobe photos, clothing details, or URL query information.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => choose("accepted")} className="focus-ring min-h-10 rounded-full bg-cocoa px-4 text-xs font-semibold text-canvas">Allow analytics</button>
            <button type="button" onClick={() => choose("declined")} className="focus-ring min-h-10 rounded-full border border-line bg-white/80 px-4 text-xs font-semibold text-ink">Decline analytics</button>
            {consent !== "unknown" ? <button type="button" onClick={() => setPreferenceOpen(false)} className="focus-ring min-h-10 px-2 text-xs font-semibold text-muted">Keep current choice</button> : null}
            <Link href="/legal/cookie-policy" className="focus-ring inline-flex min-h-10 items-center px-2 text-xs font-semibold text-olive">Cookie policy</Link>
          </div>
        </aside>
      ) : null}

      {hydrated && consent !== "unknown" && !preferenceOpen ? (
        <button type="button" onClick={() => setPreferenceOpen(true)} className="focus-ring fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-3 z-[80] min-h-9 rounded-full border border-line bg-surface/90 px-3 text-[11px] font-semibold text-muted shadow-soft backdrop-blur md:bottom-4" aria-label="Open cookie preferences">
          Cookie choices
        </button>
      ) : null}
    </>
  );
}
