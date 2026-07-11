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
          title="Welcome back to FitPick."
          subtitle="Sign in to see your wardrobe and choose what to wear next."
        />
        <LoginForm />
      </section>
      <Link href="/">
        <Button variant="secondary" className="mt-6 w-full">Back to entry</Button>
      </Link>
    </AppShell>
  );
}
