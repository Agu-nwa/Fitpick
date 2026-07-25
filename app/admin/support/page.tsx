import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminSupportDashboard } from "@/components/admin/AdminSupportDashboard";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Support Inbox | MyFitPick Admin",
  robots: { index: false, follow: false, nocache: true }
};

export default async function AdminSupportPage() {
  const auth = await requireAdmin();
  if (!auth.ok) notFound();
  return <AdminSupportDashboard agentName={auth.user.name} />;
}
