import { AppShell } from "@/components/layout/AppShell";
import { DynamicEditorialGreeting } from "@/components/home/DynamicEditorialGreeting";
import { SimpleHomeActions } from "@/components/home/SimpleHomeActions";
import { GettingStartedChecklist } from "@/components/onboarding/GettingStartedChecklist";
import { WeatherStylingCard } from "@/components/home/WeatherStylingCard";
import { requireUser } from "@/lib/auth";
import { getOnboardingState } from "@/lib/onboarding/onboarding-state";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const auth = await requireUser();
  if (!auth.ok) redirect("/login");
  const onboarding = await getOnboardingState(auth.user);

  return (
    <AppShell>
      <header className="border-b border-line pb-8 pt-2 sm:pb-10">
        <div className="max-w-4xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-cocoa">Today in your wardrobe</p>
          <DynamicEditorialGreeting />
        </div>
      </header>
      <div className="mt-8 flex flex-col gap-8">
        <SimpleHomeActions />
        <WeatherStylingCard />
        <GettingStartedChecklist initialState={onboarding} />
      </div>
    </AppShell>
  );
}
