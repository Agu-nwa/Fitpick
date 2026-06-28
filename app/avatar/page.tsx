import { AppShell } from "@/components/layout/AppShell";
import { AvatarStudioClient } from "@/components/avatar/AvatarStudioClient";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AvatarPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Avatar"
        title="My Avatar"
        subtitle="Adding your size helps FitPick show outfits better. You can skip this and add it later."
      />
      <div className="mt-7">
        <AvatarStudioClient />
      </div>
    </AppShell>
  );
}
