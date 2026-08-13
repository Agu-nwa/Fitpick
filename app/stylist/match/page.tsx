import { StylistChat } from "@/components/stylist/StylistChat";
import { StylistStudioShell } from "@/components/stylist/StylistStudioShell";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function MatchOutfitPage() {
  const auth = await requireUser();
  if (!auth.ok) redirect("/login");

  return (
    <StylistStudioShell className="gap-0 lg:px-5 lg:pb-5 lg:pt-5 xl:px-6">
      <StylistChat initialFlow="match" productMode="match" />
    </StylistStudioShell>
  );
}
