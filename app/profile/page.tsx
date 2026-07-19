import Link from "next/link";
import { UserRound } from "lucide-react";
import { ProfileSessionCard } from "@/components/auth/ProfileSessionCard";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileIntegrationClient } from "@/components/profile/ProfileIntegrationClient";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";

const links = [
  { label: "Your Style DNA", href: "/style-profile", helper: "Teach MyFitPick how you like to dress." },
  { label: "Preferences", href: "/profile/preferences", helper: "Manage outfit, weather, and privacy preferences." },
  { label: "Credits", href: "/wallet", helper: "Review your balance, ledger, and one-time Credit purchases." },
  { label: "Avatar model", href: "/avatar", helper: "Edit your model photo, fit details, and try-on settings." }
];

export default function ProfilePage() {
  return (
    <AppShell>
      <header className="relative overflow-hidden rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-8">
        <div className="absolute right-[-5rem] top-[-6rem] size-60 rounded-full bg-cocoa/10 blur-3xl" />
        <div className="relative max-w-4xl">
          <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">
            <UserRound size={14} aria-hidden="true" />
            Profile
          </p>
          <h1 className="font-editorial text-balance text-4xl font-semibold leading-[0.98] tracking-editorial text-ink sm:text-5xl lg:text-6xl">
            Your style profile.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Personalization, privacy, notifications, and Credits in one place.
          </p>
        </div>
      </header>

      <ProfileSessionCard />
      <ProfileIntegrationClient />

      <section className="mt-7">
        <SectionHeader title="Account links" />
        <div className="space-y-2">
          {links.map((item) => (
            <Link key={item.label} href={item.href} className="focus-ring block rounded-xl3">
              <Card className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <span>
                    <span className="block text-sm font-semibold text-ink">{item.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted">{item.helper}</span>
                  </span>
                  <span className="text-muted" aria-hidden>›</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
