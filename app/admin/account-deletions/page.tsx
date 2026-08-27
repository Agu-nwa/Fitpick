import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountDeletionAdmin } from "@/components/admin/AccountDeletionAdmin";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account Deletions | MyFitPick Admin",
  robots: { index: false, follow: false, nocache: true }
};

export default async function AccountDeletionsPage() {
  const auth = await requireAdmin();
  if (!auth.ok) notFound();
  return <AccountDeletionAdmin />;
}
