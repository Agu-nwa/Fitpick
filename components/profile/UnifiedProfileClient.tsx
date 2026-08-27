"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, LogOut, MapPin, ShieldCheck, SlidersHorizontal, Trash2, UserRound, WalletCards, ScanFace, type LucideIcon } from "lucide-react";
import { AvatarStudioClient } from "@/components/avatar/AvatarStudioClient";
import { LocationSelector } from "@/components/home/LocationSelector";
import { AuthRequiredState } from "@/components/integration/AuthRequiredState";
import { BackendUnavailableState } from "@/components/integration/BackendUnavailableState";
import { LoadingCard } from "@/components/integration/LoadingCard";
import { StyleProfileForm } from "@/components/style-profile/StyleProfileForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { WalletSummaryCard } from "@/components/wallet/WalletSummaryCard";
import { useRevealContent } from "@/hooks/use-reveal-content";
import { useSession } from "@/hooks/use-session";
import {
  getWallet,
  getPreferences,
  logout,
  requestAccountDeletion,
  updateCurrentUser,
  updatePreferences,
  type CreditWalletData,
  type CurrentUserSummary,
  type LocationCity
} from "@/lib/api-client";
import { safeUserMessage } from "@/lib/user-facing-errors";
import { cn } from "@/lib/utils";

type SectionId = "personal" | "appearance" | "style" | "location" | "credits" | "account";

const sections: Array<{ id: SectionId; label: string; helper: string; icon: LucideIcon }> = [
  { id: "personal", label: "Account", helper: "Name and email", icon: UserRound },
  { id: "appearance", label: "My Model", helper: "Try-on preview", icon: ScanFace },
  { id: "style", label: "Style preferences", helper: "Stylist preferences", icon: SlidersHorizontal },
  { id: "location", label: "Location", helper: "Weather styling", icon: MapPin },
  { id: "credits", label: "Credits", helper: "Balance and top up", icon: WalletCards },
  { id: "account", label: "Privacy", helper: "Legal and sign out", icon: ShieldCheck }
];

function normalizeSection(value: string | null): SectionId {
  if (value === "privacy") return "account";
  if (value === "account" || !value) return "personal";
  return sections.some((section) => section.id === value) ? (value as SectionId) : "personal";
}

function sectionQueryValue(section: SectionId) {
  if (section === "personal") return "account";
  if (section === "account") return "privacy";
  return section;
}

const inputClass =
  "focus-ring min-h-11 w-full rounded-2xl border border-line bg-white/85 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted";

export function UnifiedProfileClient() {
  const session = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedSection = normalizeSection(searchParams.get("section"));
  const contentRef = useRef<HTMLElement>(null);
  const revealContent = useRevealContent();

  const sectionTitle = useMemo(
    () => sections.find((section) => section.id === selectedSection)?.label || "Account",
    [selectedSection]
  );

  function chooseSection(next: SectionId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", sectionQueryValue(next));

    const query = params.toString();
    router.replace(`/profile${query ? `?${query}` : ""}`, { scroll: false });
    revealContent(contentRef, { delayMs: 90, topOffset: 24, bottomOffset: 136 });
  }

  if (session.status === "loading") return <LoadingCard title="Loading profile" />;
  if (session.status === "backend-unavailable") return <BackendUnavailableState onRetry={session.refresh} />;
  if (session.status === "logged-out") return <AuthRequiredState />;

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)] xl:items-start">
      <Card className="p-3 xl:sticky xl:top-8">
        <div className="px-2 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cocoa">Profile</p>
          <p className="mt-1 text-sm leading-6 text-muted">Your account, style, and Credits.</p>
        </div>
        <div className="mt-3 grid gap-2" role="tablist" aria-label="Profile sections">
          {sections.map((section) => {
            const active = selectedSection === section.id;
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => chooseSection(section.id)}
                className={cn(
                  "focus-ring flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 text-left transition",
                  active ? "bg-cocoa text-canvas shadow-glow" : "text-muted hover:bg-white hover:text-ink"
                )}
              >
                <Icon size={17} strokeWidth={active ? 2.3 : 1.7} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{section.label}</span>
                  <span className={cn("mt-0.5 block truncate text-[11px]", active ? "text-canvas/70" : "text-muted")}>{section.helper}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <section ref={contentRef} aria-labelledby="profile-section-title" className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cocoa">{sectionTitle}</p>
            <h2 id="profile-section-title" className="font-editorial mt-1 text-3xl font-semibold leading-none text-ink">
              {sectionTitle === "Account" ? "Your details." : sectionTitle}
            </h2>
          </div>
        </div>

        {selectedSection === "personal" ? <PersonalDetailsSection session={session} /> : null}
        {selectedSection === "appearance" ? <AvatarStudioClient /> : null}
        {selectedSection === "style" ? <StyleProfileForm /> : null}
        {selectedSection === "location" ? <LocationSection session={session} /> : null}
        {selectedSection === "credits" ? <CreditsSection /> : null}
        {selectedSection === "account" ? <AccountSection session={session} /> : null}
      </section>
    </div>
  );
}

function PersonalDetailsSection({ session }: { session: ReturnType<typeof useSession> }) {
  const [name, setName] = useState(session.user?.name || "");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const statusRef = useRef<HTMLDivElement>(null);
  const revealContent = useRevealContent();

  useEffect(() => {
    setName(session.user?.name || "");
  }, [session.user?.name]);

  async function saveName() {
    const trimmed = name.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
    setNotice("");
    setError("");

    if (trimmed.length < 2) {
      setError("Enter the name you want shown in MyFitPick.");
      revealContent(statusRef, { delayMs: 60, topOffset: 24, bottomOffset: 136 });
      return;
    }

    setSaving(true);
    const result = await updateCurrentUser({ name: trimmed });
    setSaving(false);

    if (!result.ok) {
      setError(safeUserMessage(result.error, "We couldn’t save your changes. Please try again."));
      revealContent(statusRef, { delayMs: 60, topOffset: 24, bottomOffset: 136 });
      return;
    }

    await session.refresh();
    setNotice("Your preferences are saved.");
    revealContent(statusRef, { delayMs: 60, topOffset: 24, bottomOffset: 136 });
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-cocoa text-xl font-semibold text-canvas" aria-hidden>
          {session.user?.name?.slice(0, 1).toUpperCase() || "M"}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-ink">{session.user?.name || "MyFitPick user"}</p>
          <p className="mt-1 truncate text-sm text-muted">{session.user?.email}</p>
        </div>
      </div>

      <div ref={statusRef} aria-live="polite">
        {error ? <p className="rounded-2xl border border-danger/25 bg-danger/10 px-3 py-2 text-xs font-semibold text-ink">{error}</p> : null}
        {notice ? <p className="rounded-2xl border border-success/25 bg-success/10 px-3 py-2 text-xs font-semibold text-ink">{notice}</p> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block text-sm font-semibold text-ink" htmlFor="profile-display-name">
          Display name
          <input
            id="profile-display-name"
            className={cn(inputClass, "mt-2")}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
          />
        </label>
        <Button type="button" onClick={() => void saveName()} disabled={saving} className="w-full rounded-full sm:w-auto">
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>

      <div className="rounded-2xl border border-line bg-canvas/60 p-4">
        <p className="text-sm font-semibold text-ink">Email address</p>
        <p className="mt-1 text-sm text-muted">{session.user?.email}</p>
      </div>
    </Card>
  );
}

function LocationSection({ session }: { session: ReturnType<typeof useSession> }) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [savedLocation, setSavedLocation] = useState(session.user?.weatherLocationName || "");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setSavedLocation(session.user?.weatherLocationName || "");
  }, [session.user?.weatherLocationName]);

  async function handleLocationSaved(location: LocationCity, user?: CurrentUserSummary["user"]) {
    setSavedLocation(user?.weatherLocationName || `${location.cityName}, ${location.countryName}`);
    setNotice("Location saved.");
    setSelectorOpen(false);
    await session.refresh();
  }

  return (
    <>
      <Card className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-ink">Dressing location</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            City and country are enough for weather-aware styling. MyFitPick does not need your precise address.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-canvas/60 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cocoa">Current city</p>
          <p className="mt-2 text-lg font-semibold text-ink">{savedLocation || "No city selected yet"}</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            {savedLocation ? "Used for weather-aware outfit suggestions." : "Choose a city so weather styling can work without asking every time."}
          </p>
        </div>
        {notice ? <p className="rounded-2xl border border-success/25 bg-success/10 px-3 py-2 text-xs font-semibold text-ink">{notice}</p> : null}
        <Button type="button" className="w-full rounded-full" onClick={() => setSelectorOpen(true)}>
          <MapPin size={16} aria-hidden="true" />
          {savedLocation ? "Change city" : "Choose city"}
        </Button>
      </Card>
      <LocationSelector open={selectorOpen} onClose={() => setSelectorOpen(false)} onSaved={handleLocationSaved} />
    </>
  );
}

function CreditsSection() {
  const [wallet, setWallet] = useState<CreditWalletData["wallet"] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    void getWallet().then((result) => {
      if (!active) return;
      if (result.ok) {
        setWallet(result.data.wallet);
        setStatus("ready");
        return;
      }
      setStatus("error");
    });

    return () => {
      active = false;
    };
  }, []);

  if (status === "loading") return <LoadingCard title="Loading Credits" />;

  return (
    <div className="space-y-4">
      {status === "error" ? (
        <Card className="border-warning/20 bg-warning/10">
          <p className="text-sm font-semibold text-ink">Unable to load your Credits right now.</p>
          <p className="mt-1 text-sm leading-6 text-muted">You can try again in a moment.</p>
        </Card>
      ) : null}
      <WalletSummaryCard wallet={wallet} />
      <Link href="/wallet" className="block">
        <Button type="button" className="w-full rounded-full">Top Up</Button>
      </Link>
    </div>
  );
}

function AccountSection({ session }: { session: ReturnType<typeof useSession> }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [downloadingData, setDownloadingData] = useState(false);
  const [confirmDeleteRequest, setConfirmDeleteRequest] = useState(false);
  const [message, setMessage] = useState("");
  const [privacy, setPrivacy] = useState<Record<string, boolean> | null>(null);
  const [savingPrivacyKey, setSavingPrivacyKey] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getPreferences().then((result) => {
      if (cancelled || !result.ok) return;
      setPrivacy({
        photoStorageConsent: Boolean(result.data.privacy?.photoStorageConsent),
        aiProcessingConsent: Boolean(result.data.privacy?.aiProcessingConsent),
        personalizedRecommendations: result.data.privacy?.personalizedRecommendations !== false,
        outfitHistoryEnabled: result.data.privacy?.outfitHistoryEnabled !== false,
        marketingNotifications: Boolean(result.data.privacy?.marketingNotifications)
      });
    });
    return () => { cancelled = true; };
  }, []);

  async function setPrivacyChoice(key: string, checked: boolean) {
    if (!privacy || savingPrivacyKey) return;
    setSavingPrivacyKey(key);
    setMessage("");
    const result = await updatePreferences({ [key]: checked });
    setSavingPrivacyKey("");
    if (!result.ok) {
      setMessage(safeUserMessage(result.error, "We couldn’t save that privacy choice. Please try again."));
      return;
    }
    setPrivacy((current) => current ? { ...current, [key]: checked } : current);
    setMessage(checked ? "Privacy choice saved." : "That processing has been turned off.");
  }

  async function handleLogout() {
    setSigningOut(true);
    setMessage("");
    const result = await logout();
    setSigningOut(false);

    if (!result.ok) {
      setMessage("We couldn’t sign you out. Please try again.");
      return;
    }

    await session.refresh();
    router.replace("/login");
  }

  async function handleDeleteRequest() {
    if (!confirmDeleteRequest) {
      setConfirmDeleteRequest(true);
      setMessage("Press Request deletion again to send the request.");
      return;
    }

    setRequestingDeletion(true);
    setMessage("");
    const result = await requestAccountDeletion({ confirmation: "DELETE" });
    setRequestingDeletion(false);

    if (!result.ok) {
      setMessage(safeUserMessage(result.error, "We couldn’t send your request. Please try again."));
      return;
    }

    setMessage("Your account has been disabled. Deletion will be processed according to retention and legal requirements.");
  }

  async function handleDataExport() {
    setDownloadingData(true);
    setMessage("");
    try {
      const response = await fetch("/api/users/me/data-export", { credentials: "include", cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        setMessage(payload?.error?.message || "We couldn’t prepare your data export. Please try again.");
        return;
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `myfitpick-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setMessage("Your personal-data export has downloaded.");
    } catch {
      setMessage("We couldn’t prepare your data export. Please try again.");
    } finally {
      setDownloadingData(false);
    }
  }

  function handleCookiePreferences() {
    window.dispatchEvent(new Event("fitpick:open-cookie-preferences"));
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-ink">Your privacy choices</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            Choose what MyFitPick may store and process. Photo storage and third-party AI processing are separate choices and can be withdrawn at any time.
          </p>
        </div>
        {!privacy ? <p className="text-sm text-muted">Loading privacy choices…</p> : (
          <div className="divide-y divide-line rounded-2xl border border-line bg-white/70 px-4">
            {[
              {
                key: "photoStorageConsent",
                title: "Private photo storage",
                detail: "Store wardrobe, reference and Studio Model photos in MyFitPick’s private image storage. Turning this off blocks new photo uploads; it does not silently delete existing closet items."
              },
              {
                key: "aiProcessingConsent",
                title: "AI photo and prompt processing",
                detail: "Allow MyFitPick to send the photos, prompts and wardrobe details needed for a requested feature to specialist AI service providers. Processing may occur outside your country; the Privacy Policy identifies the providers and safeguards."
              },
              {
                key: "personalizedRecommendations",
                title: "Learn from my feedback",
                detail: "Use likes, dislikes, saves and feedback to improve future recommendations. Turning this off revokes previously learned fashion-memory signals."
              },
              {
                key: "outfitHistoryEnabled",
                title: "Save outfit activity",
                detail: "Keep generated, viewed, saved and worn outfit activity. Turning this off deletes stored outfit-history records and stops new history events."
              },
              {
                key: "marketingNotifications",
                title: "Marketing messages",
                detail: "Receive optional product and campaign messages. Authentication, security, purchase and privacy-request emails remain transactional."
              }
            ].map((choice) => (
              <label key={choice.key} className="flex cursor-pointer gap-3 py-4">
                <input
                  type="checkbox"
                  className="mt-1 size-5 accent-cocoa"
                  checked={Boolean(privacy[choice.key])}
                  disabled={Boolean(savingPrivacyKey)}
                  onChange={(event) => void setPrivacyChoice(choice.key, event.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{choice.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted">{choice.detail}</span>
                </span>
              </label>
            ))}
          </div>
        )}
        <p className="text-xs leading-5 text-muted">
          See the <Link href="/legal/privacy" className="font-semibold text-cocoa underline underline-offset-2">Privacy Policy</Link> for retention, provider and deletion details.
        </p>
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-ink">Session</p>
          <p className="mt-1 text-sm leading-6 text-muted">You are signed in as {session.user?.email}.</p>
        </div>
        {message ? <p className="rounded-2xl border border-line bg-canvas/70 px-3 py-2 text-xs font-semibold text-ink">{message}</p> : null}
        <Button type="button" variant="danger" className="w-full rounded-full" disabled={signingOut} onClick={() => void handleLogout()}>
          <LogOut size={16} aria-hidden="true" />
          {signingOut ? "Signing out..." : "Sign out"}
        </Button>
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-ink">Legal and privacy</p>
          <p className="mt-1 text-sm leading-6 text-muted">Download a portable copy of your account data or review the public policies for privacy, Credits, refunds, and virtual try-on previews. Account deletion disables access immediately. Limited transaction, security, provider, or backup records may remain where legally or operationally required.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="secondary" className="w-full rounded-full sm:col-span-2" disabled={downloadingData} onClick={() => void handleDataExport()}>
            <Download size={16} aria-hidden="true" />
            {downloadingData ? "Preparing export..." : "Download my data"}
          </Button>
          <Link href="/legal" className="block">
            <Button type="button" variant="secondary" className="w-full rounded-full">
              <ShieldCheck size={16} aria-hidden="true" />
              Legal center
            </Button>
          </Link>
          <Button type="button" variant="secondary" className="w-full rounded-full" onClick={handleCookiePreferences}>
            Cookie preferences
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full rounded-full"
            disabled={requestingDeletion}
            onClick={() => void handleDeleteRequest()}
          >
            <Trash2 size={16} aria-hidden="true" />
            {requestingDeletion ? "Sending..." : "Request deletion"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
