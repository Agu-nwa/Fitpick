import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ToggleRow } from "@/components/ui/ToggleRow";
import { stylePreferences } from "@/lib/mock-data";

const links = [
  { label: "Frontend state library", href: "/states", helper: "Loading, empty, error, offline, permission, and premium states." },
  { label: "Backend readiness map", href: "/backend-ready", helper: "API contract notes for the next engineering phase." },
  { label: "Support", href: "/profile", helper: "Help and product feedback placeholder." },
  { label: "Delete/export data", href: "/profile", helper: "Privacy action placeholder for backend phase." },
];

export default function ProfilePage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Profile" title="Your style profile" subtitle="Personalization, privacy, notifications, and FitPick Plus." />

      <Card>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cocoa text-xl font-semibold text-white" aria-hidden>F</div>
          <div>
            <h2 className="text-base font-semibold text-ink">FitPick user</h2>
            <p className="mt-1 text-sm text-muted">Clean, polished, culturally fluent picks.</p>
          </div>
        </div>
      </Card>

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
        <SectionHeader title="Privacy and permissions" />
        <div className="space-y-3">
          <ToggleRow label="Wardrobe photo privacy" description="Wardrobe photos stay private to your account once backend storage is added." />
          <ToggleRow label="Weather tips" description="Use weather to avoid outfits that feel too hot, cold, or rainy." />
          <ToggleRow label="Outfit reminders" description="Get soft reminders for mornings, events, weather changes, and saved looks." defaultOn={false} />
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title="FitPick Plus" />
        <Card className="bg-cocoa text-white">
          <h3 className="text-lg font-semibold">Unlock deeper outfit memory</h3>
          <p className="mt-2 text-sm leading-6 text-white/75">More outfit options, event planning, travel packing, and smarter repeats.</p>
          <Link href="/plus"><Button variant="secondary" className="mt-5 w-full bg-white text-cocoa">See Plus</Button></Link>
        </Card>
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
