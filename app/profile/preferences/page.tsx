import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";

const questions = [
  { q: "Which style feels closest to you?", a: ["Simple", "Polished", "Streetwear", "Elegant", "Bold", "Traditional"] },
  { q: "How dressed up do you like to look?", a: ["Relaxed", "Balanced", "Polished", "Formal"] },
  { q: "What matters most when you dress?", a: ["Comfort", "Weather", "Modesty", "Photo-ready", "Professional"] },
  { q: "How often should native wear appear?", a: ["Often", "Sometimes", "Only for events", "Rarely"] }
];

export default function PreferencesPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Style profile" title="Style preferences" subtitle="Help FitPick understand what feels right for you." />
      <div className="space-y-5">
        {questions.map((item, index) => (
          <Card key={item.q}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-terracotta">Question {index + 1}</p>
            <h2 className="mt-2 text-base font-semibold text-ink">{item.q}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {item.a.map((answer, answerIndex) => <Chip key={answer} active={answerIndex === 0}>{answer}</Chip>)}
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link href="/profile"><Button variant="secondary" className="w-full">Back</Button></Link>
        <Button>Save preferences</Button>
      </div>
    </AppShell>
  );
}
