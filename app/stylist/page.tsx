import { AppShell }
from "@/components/layout/AppShell";

import { StylistChat }
from "@/components/stylist/StylistChat";

export default function StylistPage() {
  return (
    <AppShell>
      <div className="space-y-6">

        <h1 className="text-3xl font-bold">
          AI Stylist
        </h1>

        <p>
          Ask FitPick what to wear.
        </p>

        <StylistChat />

      </div>
    </AppShell>
  );
}