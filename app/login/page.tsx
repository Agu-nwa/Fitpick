import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

export default function LoginPage() {
  return (
    <AppShell showNav={false} className="flex flex-col justify-between pb-8">
      <section>
        <PageHeader
          eyebrow="Account access"
          title="Sign in to FitPick"
          subtitle="Save wardrobe items, outfit history, and preferences across your daily outfit decisions."
        />
        <LoginForm />
      </section>
      <Link href="/home">
        <Button variant="secondary" className="mt-6 w-full">Continue with demo app</Button>
      </Link>
    </AppShell>
  );
}
