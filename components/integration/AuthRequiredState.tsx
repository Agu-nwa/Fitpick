import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export function AuthRequiredState() {
  return (
    <Card className="p-5">
      <p className="font-editorial text-2xl font-semibold leading-none text-ink">Sign in to continue.</p>
      <p className="mt-3 text-sm leading-6 text-muted">
        Sign in or create an account to save wardrobe items, outfit history, and preferences.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href="/login">
          <Button variant="secondary" className="w-full">Sign in</Button>
        </Link>
        <Link href="/register">
          <Button className="w-full">Create account</Button>
        </Link>
      </div>
    </Card>
  );
}
