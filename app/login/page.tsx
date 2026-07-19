import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { getSessionUser } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getSessionUser();
  if (session) redirect("/home");

  return (
    <main id="main-content" className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden bg-canvas px-5 py-[calc(1rem+var(--safe-top))] text-ink">
      <section className="w-full max-w-[430px] pb-[calc(0.75rem+var(--safe-bottom))]">
        <Link href="/" className="mx-auto flex w-fit items-center gap-2 rounded-full px-2 py-1 text-lg font-semibold tracking-tight text-ink">
          <span className="flex size-8 items-center justify-center rounded-full bg-cocoa text-canvas">
            <Sparkles size={16} aria-hidden="true" />
          </span>
          MyFitPick
        </Link>

        <div className="mt-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cocoa">Welcome</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Sign in or create account</h1>
          <p className="mt-2 text-sm leading-6 text-muted">Enter your email. We will send a secure code.</p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
