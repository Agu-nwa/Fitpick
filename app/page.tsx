import { AppShell } from "@/components/layout/AppShell";
import { SimpleHomeActions } from "@/components/home/SimpleHomeActions";
import { SimpleStartGuide } from "@/components/onboarding/SimpleStartGuide";
import { PageHeader } from "@/components/ui/PageHeader";

export default function Page() {
  return (
    <AppShell>
      <PageHeader eyebrow="Today" title="What do you want to do today?" subtitle="Choose one simple next step." />
      <div className="mt-7 space-y-7">
        <SimpleHomeActions />
        <SimpleStartGuide />
      </div>
    </AppShell>
  );
}
