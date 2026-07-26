import { ContextualTip } from "@/components/onboarding/ContextualTip";
import { StylistChat } from "@/components/stylist/StylistChat";
import { StylistStudioShell } from "@/components/stylist/StylistStudioShell";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function MatchOutfitPage() {
  const auth = await requireUser();
  if (!auth.ok) redirect("/login");

  return (
    <StylistStudioShell
      eyebrow="Match an Outfit"
      title="Style around inspiration."
      description="Upload a product photo, screenshot, or outfit reference and build a look from your closet."
      badge="Photo or screenshot"
    >
      <ContextualTip tipId="match-outfit" dismissedTips={auth.user.onboardingTipsDismissed}>
        Upload a shopping screenshot or product photo and MyFitPick will match it with your closet.
      </ContextualTip>
      <StylistChat initialFlow="match" productMode="match" />
    </StylistStudioShell>
  );
}
