import { AppShell } from "@/components/layout/AppShell";
import { StylistChat } from "@/components/stylist/StylistChat";
import { PageHeader } from "@/components/ui/PageHeader";

export default function StylistPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Stylist"
        title="FitPick Stylist"
        subtitle="Ask what to wear for church, a wedding, date night, work, travel, or the weekend."
      />
      <StylistChat />
    </AppShell>
  );
}
