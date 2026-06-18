import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export function AuthRequiredState() {
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold text-ink">Signed out</p>
      <p className="mt-2 text-xs leading-5 text-muted">
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
