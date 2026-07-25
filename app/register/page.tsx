import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { getSessionUser } from "@/lib/auth";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getSessionUser();
  if (session) redirect("/home");
  const params = await searchParams;

  return (
    <main id="main-content" className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden bg-canvas px-4 py-[calc(0.75rem+var(--safe-top))] text-ink sm:px-5">
      <section className="w-full max-w-[440px] pb-[calc(0.75rem+var(--safe-bottom))]">
        <Link href="/" className="focus-ring mx-auto mb-4 flex w-fit items-center rounded-full px-2 py-1">
          <BrandLogo size="md" priority />
        </Link>
        <RegisterForm nextPath={params.next} />
      </section>
    </main>
  );
}
