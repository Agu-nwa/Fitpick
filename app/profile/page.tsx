import Link from "next/link";
import { ProfileSessionCard } from "@/components/auth/ProfileSessionCard";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileIntegrationClient } from "@/components/profile/ProfileIntegrationClient";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { stylePreferences } from "@/lib/mock-data";

const links = [
  { label: "Frontend state library", href: "/states", helper: "Loading, empty, error, offline, permission, and premium states." },
  { label: "Backend readiness map", href: "/backend-ready", helper: "API contract notes for the next engineering phase." },
  { label: "Sign in", href: "/login", helper: "Access your saved wardrobe, preferences, and outfit history." },
  { label: "Delete/export data", href: "/profile", helper: "Privacy action placeholder for backend phase." },
];

export default function ProfilePage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Profile" title="Your style profile" subtitle="Personalization, privacy, notifications, and FitPick Plus." />

      <ProfileSessionCard />
      <ProfileIntegrationClient />

      <section className="mt-7">
        <SectionHeader title="Style preferences" action={<Link href="/profile/preferences" className="text-xs font-semibold text-cocoa">Edit</Link>} />
        <div className="space-y-3">
          {stylePreferences.map((preference) => (
            <Card key={preference.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-ink">{preference.label}</p>
                <p className="text-right text-sm text-muted">{preference.value}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title="Build system" />
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
