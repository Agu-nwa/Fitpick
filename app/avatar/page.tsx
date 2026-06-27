import { AppShell } from "@/components/layout/AppShell";
import { AvatarStudioClient } from "@/components/avatar/AvatarStudioClient";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AvatarPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Luxury tier"
        title="Create your Digital Human"
        subtitle="Choose how FitPick visualizes your outfits. This is an AI fashion visualization, not exact body-measurement virtual try-on."
      />
      <div className="mt-7">
        <AvatarStudioClient />
      </div>
    </AppShell>
  );
}
