import { AppShell } from "@/components/layout/AppShell";
import { ContextualTip } from "@/components/onboarding/ContextualTip";
import { LookPreviewClient } from "@/components/outfit/LookPreviewClient";
import { requireUser } from "@/lib/auth";
import { resolveTryOnOrigin, tryOnOriginDestination } from "@/lib/tryon/preview-ui-state";
import { redirect } from "next/navigation";

export default async function OutfitPreviewPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ origin?: string }>;
}) {
  const auth = await requireUser();
  if (!auth.ok) redirect("/login");
  const { id } = await params;
  const { origin } = await searchParams;
  const closeHref = tryOnOriginDestination(resolveTryOnOrigin(origin));

  return (
    <AppShell contextCloseHref={closeHref}>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(166,124,82,0.12),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(68,74,58,0.12),transparent_26%)]" />
      <div>
        <div className="mb-5">
          <ContextualTip tipId="virtual-try-on" dismissedTips={auth.user.onboardingTipsDismissed}>
            Choose your My Model for cleaner Virtual Try-On previews.
          </ContextualTip>
        </div>
        <LookPreviewClient outfitId={id} initialOrigin={origin} />
      </div>
    </AppShell>
  );
}
