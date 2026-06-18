import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PlusStatusClient } from "@/components/plus/PlusStatusClient";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function PlusPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="FitPick Plus" title="More looks, smarter memory" subtitle="Premium appears after value. It gives deeper styling tools without shaming free users." />
      <PlusStatusClient />

      <section className="mt-7">
        <SectionHeader title="Free vs Plus" />
        <Card>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <Chip>Free</Chip>
              <p className="mt-3 leading-6 text-muted">Basic wardrobe, limited daily outfit picks, saved looks limit.</p>
            </div>
            <div>
              <Chip active>Plus</Chip>
              <p className="mt-3 leading-6 text-muted">Unlimited picks, travel packing, event planning, advanced outfit memory.</p>
            </div>
          </div>
        </Card>
      </section>
      <Link href="/profile" className="mt-6 block"><Button variant="ghost" className="w-full">Restore purchase</Button></Link>
    </AppShell>
  );
}
