import { AppShell } from "@/components/layout/AppShell";
import { StylistChat } from "@/components/stylist/StylistChat";
import { PageHeader } from "@/components/ui/PageHeader";

export default function StylistPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="AI stylist"
        title="FitPick Stylist"
        subtitle="Ask for church, wedding, date night, business casual, travel, or a full wardrobe-grounded outfit."
      />
      <StylistChat />
    </AppShell>
  );
}
