import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  return (
    <AppShell showNav={false} className="flex flex-col justify-between pb-8">
      <section>
        <header className="relative overflow-hidden rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-8">
          <div className="absolute right-[-5rem] top-[-6rem] size-60 rounded-full bg-cocoa/10 blur-3xl" />
          <div className="relative max-w-4xl">
            <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">
              <LockKeyhole size={14} aria-hidden="true" />
              Account access
            </p>
            <h1 className="font-editorial text-balance text-5xl font-semibold leading-[0.9] tracking-editorial text-ink sm:text-6xl">
              Welcome back to FitPick.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
              Sign in to see your wardrobe and choose what to wear next.
            </p>
          </div>
        </header>
        <LoginForm />
      </section>
      <Link href="/">
        <Button variant="secondary" className="mt-6 w-full">Back to entry</Button>
      </Link>
    </AppShell>
  );
}
