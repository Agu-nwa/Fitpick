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
      <header className="relative overflow-hidden rounded-xl4 border border-line bg-white/76 p-6 shadow-card backdrop-blur-xl sm:p-8">
        <div className="max-w-4xl">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-cocoa">Home</p>
          <DynamicEditorialGreeting />
        </div>
      </header>
      <div className="mt-6 flex flex-col gap-6">
        <WeatherStylingCard />
        <SimpleHomeActions />
        <GettingStartedChecklist initialState={onboarding} />
      </div>
    </AppShell>
  );
}
