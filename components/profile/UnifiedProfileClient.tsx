"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogOut, MapPin, ShieldCheck, SlidersHorizontal, Trash2, UserRound, WalletCards, ScanFace, type LucideIcon } from "lucide-react";
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
  logout,
  requestAccountDeletion,
  updateCurrentUser,
  type CreditWalletData,
  type CurrentUserSummary,
  type LocationCity
} from "@/lib/api-client";
import { safeUserMessage } from "@/lib/user-facing-errors";
import { cn } from "@/lib/utils";

type SectionId = "personal" | "appearance" | "style" | "location" | "credits" | "account";

const sections: Array<{ id: SectionId; label: string; helper: string; icon: LucideIcon }> = [
  { id: "personal", label: "Personal", helper: "Name and email", icon: UserRound },
  { id: "appearance", label: "Appearance", helper: "Model and fit", icon: ScanFace },
  { id: "style", label: "Style", helper: "Stylist preferences", icon: SlidersHorizontal },
  { id: "location", label: "Location", helper: "Weather styling", icon: MapPin },
  { id: "credits", label: "Credits", helper: "Balance and top up", icon: WalletCards },
  { id: "account", label: "Account", helper: "Legal and sign out", icon: ShieldCheck }
];

function normalizeSection(value: string | null): SectionId {
  return sections.some((section) => section.id === value) ? (value as SectionId) : "personal";
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
    () => sections.find((section) => section.id === selectedSection)?.label || "Personal",
    [selectedSection]
  );

  function chooseSection(next: SectionId) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "personal") params.delete("section");
    else params.set("section", next);

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
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cocoa">Profile menu</p>
          <p className="mt-1 text-sm leading-6 text-muted">Your style, fit, and account.</p>
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
              {sectionTitle === "Personal" ? "Your details." : sectionTitle}
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
      setError(safeUserMessage(result.error, "Unable to save your profile right now."));
      revealContent(statusRef, { delayMs: 60, topOffset: 24, bottomOffset: 136 });
      return;
    }

    await session.refresh();
    setNotice("Profile saved.");
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
          {saving ? "Saving..." : "Save profile"}
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
        <Button type="button" className="w-full rounded-full">Top up Credits</Button>
      </Link>
    </div>
  );
}

function AccountSection({ session }: { session: ReturnType<typeof useSession> }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [confirmDeleteRequest, setConfirmDeleteRequest] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogout() {
    setSigningOut(true);
    setMessage("");
    const result = await logout();
    setSigningOut(false);

    if (!result.ok) {
      setMessage("We could not sign you out. Try again soon.");
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
    const result = await requestAccountDeletion({});
    setRequestingDeletion(false);

    if (!result.ok) {
      setMessage(safeUserMessage(result.error, "Unable to send the request right now."));
      return;
    }

    setMessage("Account deletion request received. MyFitPick will follow up by email.");
  }

  return (
    <div className="space-y-4">
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
          <p className="mt-1 text-sm leading-6 text-muted">Review the public policies for privacy, Credits, refunds, and virtual try-on previews.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href="/legal" className="block">
            <Button type="button" variant="secondary" className="w-full rounded-full">
              <ShieldCheck size={16} aria-hidden="true" />
              Legal center
            </Button>
          </Link>
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
