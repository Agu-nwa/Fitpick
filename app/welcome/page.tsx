import { redirect } from "next/navigation";
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";
import { requireUser } from "@/lib/auth";

export default async function WelcomePage() {
  const auth = await requireUser();
  if (!auth.ok) redirect("/login");
  if (auth.user.onboardingWelcomeCompletedAt) redirect("/home");

  return <WelcomeScreen />;
}
