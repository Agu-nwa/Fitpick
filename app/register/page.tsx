import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

export default function RegisterPage() {
  return (
    <AppShell showNav={false} className="flex flex-col justify-between pb-8">
      <section>
        <PageHeader
          eyebrow="Create profile"
          title="Start your FitPick account"
          subtitle="Create an account when you are ready to keep wardrobe tags, saved looks, and outfit history."
        />
        <RegisterForm />
      </section>
      <Link href="/home">
        <Button variant="secondary" className="mt-6 w-full">Explore demo first</Button>
      </Link>
    </AppShell>
  );
}
