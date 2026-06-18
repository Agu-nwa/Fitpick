"use client";

import Link from "next/link";
import { useState } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function OnboardingAccountCard() {
  const [showForm, setShowForm] = useState(false);

  if (showForm) return <RegisterForm />;

  return (
    <Card className="p-4">
      <p className="text-sm font-semibold text-ink">Save your wardrobe when ready</p>
      <p className="mt-2 text-xs leading-5 text-muted">
        Create an account to keep outfit picks, wardrobe tags, and worn history. You can still explore the demo app first.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button type="button" onClick={() => setShowForm(true)} className="w-full">Create account</Button>
        <Link href="/home">
          <Button variant="secondary" className="w-full">Explore demo</Button>
        </Link>
      </div>
    </Card>
  );
}
