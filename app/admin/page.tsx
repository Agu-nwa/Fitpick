import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { requireAdmin } from "@/lib/admin";
import { toSafeUser } from "@/models/User";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | FitPick",
  robots: {
    index: false,
    follow: false,
    nocache: true
  }
};

export default async function AdminPage() {
  const auth = await requireAdmin();

  if (!auth.ok) {
    notFound();
  }

  const safeUser = toSafeUser(auth.user);

  return (
    <AdminDashboard
      user={{
        id: safeUser.id,
        name: safeUser.name,
        email: safeUser.email,
        role: safeUser.role,
        plan: safeUser.plan
      }}
    />
  );
}
