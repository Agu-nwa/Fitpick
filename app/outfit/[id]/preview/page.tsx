import { BottomNav } from "@/components/navigation/BottomNav";
import { DesktopNav } from "@/components/navigation/DesktopNav";
import { ContextualTip } from "@/components/onboarding/ContextualTip";
import { LookPreviewClient } from "@/components/outfit/LookPreviewClient";
import { PreviewBackButton } from "@/components/outfit/PreviewBackButton";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function OutfitPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) redirect("/login");
  const { id } = await params;

  return (
    <main className="relative flex min-h-[100svh] w-full bg-canvas text-ink lg:flex-row">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(166,124,82,0.12),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(68,74,58,0.12),transparent_26%)]" />
      <DesktopNav />
      <div className="min-w-0 flex-1 overflow-y-auto pb-[calc(8rem+var(--safe-bottom))] pt-[calc(1.5rem+var(--safe-top))] lg:pb-10 lg:pt-10">
        <div className="mx-auto w-full max-w-[1480px] px-5 sm:px-8 lg:px-12 xl:px-16">
          <PreviewBackButton />
          <div className="mb-5">
            <ContextualTip tipId="virtual-try-on" dismissedTips={auth.user.onboardingTipsDismissed}>
              Choose your My Model for cleaner Virtual Try-On previews.
            </ContextualTip>
          </div>
          <LookPreviewClient outfitId={id} />
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
