import { ContextualTip } from "@/components/onboarding/ContextualTip";
import { StylistChat } from "@/components/stylist/StylistChat";
import { StylistStudioShell } from "@/components/stylist/StylistStudioShell";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function CreateLookPage() {
  const auth = await requireUser();
  if (!auth.ok) redirect("/login");

  return (
    <StylistStudioShell
      eyebrow="Create a Look"
      title="Dress for what is next."
      description="Tell MyFitPick the occasion, mood, weather, or piece you want to start with."
      badge="Editor's pick"
    >
      <ContextualTip tipId="create-look" dismissedTips={auth.user.onboardingTipsDismissed}>
        The more complete your wardrobe, the better your styling suggestions become.
      </ContextualTip>
      <StylistChat initialFlow="create" productMode="create" />
    </StylistStudioShell>
  );
}
