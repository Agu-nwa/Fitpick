import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { getSessionUser } from "@/lib/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getSessionUser();
  if (session) redirect("/home");
  const params = await searchParams;

  return (
    <main id="main-content" className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden bg-canvas px-4 py-[calc(0.75rem+var(--safe-top))] text-ink sm:px-5">
      <section className="w-full max-w-[440px] pb-[calc(0.75rem+var(--safe-bottom))]">
        <Link href="/" className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full px-2 py-1 text-lg font-semibold tracking-tight text-ink">
          <span className="flex size-8 items-center justify-center rounded-full bg-cocoa text-canvas">
            <Sparkles size={16} aria-hidden="true" />
          </span>
          MyFitPick
        </Link>
        <LoginForm nextPath={params.next} />
      </section>
    </main>
  );
}
