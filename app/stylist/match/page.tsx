import { StylistChat } from "@/components/stylist/StylistChat";
import { StylistStudioShell } from "@/components/stylist/StylistStudioShell";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ConsentNotice } from "@/components/privacy/ConsentNotice";

export default async function MatchOutfitPage() {
  const auth = await requireUser();
  if (!auth.ok) redirect("/login");

  return (
    <StylistStudioShell className="gap-0 lg:px-8 lg:pb-0 lg:pt-0 xl:px-10">
      <ConsentNotice requirePhotos requireAi />
      <StylistChat initialFlow="match" productMode="match" />
    </StylistStudioShell>
  );
}
