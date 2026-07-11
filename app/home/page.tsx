import { AppShell } from "@/components/layout/AppShell";
import { SimpleHomeActions } from "@/components/home/SimpleHomeActions";
import { SimpleStartGuide } from "@/components/onboarding/SimpleStartGuide";
import { PageHeader } from "@/components/ui/PageHeader";

export default function HomePage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Today" title="Know what to wear." subtitle="Choose from your wardrobe with the day in mind." />
      <div className="mt-7 space-y-7">
        <SimpleHomeActions />
        <SimpleStartGuide />
      </div>
    </AppShell>
  );
}
