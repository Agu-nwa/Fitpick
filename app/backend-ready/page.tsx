import { AppShell } from "@/components/layout/AppShell";
import { BackendReadyCard } from "@/components/system/BackendReadyCard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { apiContracts } from "@/lib/api-contract";

export default function BackendReadyPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Integration prep" title="Backend readiness map" subtitle="Frontend routes, mock data, and state patterns are organized for the next backend phase." />

      <Card className="bg-cocoa text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Frontend contract</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">Ready to replace mock data with APIs.</h2>
        <p className="mt-3 text-sm leading-6 text-white/75">These endpoint contracts guide wardrobe upload, tag review, outfit recommendations, user feedback, and FitPick Plus entitlement.</p>
      </Card>

      <section className="mt-7">
        <SectionHeader title="Planned API contracts" />
        <div className="space-y-3">
          {apiContracts.map((contract) => <BackendReadyCard key={contract.id} contract={contract} />)}
        </div>
      </section>
    </AppShell>
  );
}
