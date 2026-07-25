import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SupportChatClient } from "@/components/support/SupportChatClient";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Support | MyFitPick"
};

export default async function SupportPage() {
  const auth = await requireUser();
  if (!auth.ok) redirect("/login");

  return (
    <AppShell>
      <SupportChatClient userName={auth.user.name} />
    </AppShell>
  );
}
