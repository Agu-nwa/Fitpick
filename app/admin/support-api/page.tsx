import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminSupportApiDashboard } from "@/components/admin/AdminSupportApiDashboard";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Support API Console | MyFitPick Admin",
  robots: { index: false, follow: false, nocache: true }
};

export default async function AdminSupportApiPage() {
  const auth = await requireAdmin();
  if (!auth.ok) notFound();
  return <AdminSupportApiDashboard />;
}
