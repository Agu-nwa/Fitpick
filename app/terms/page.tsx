import { LegalPage } from "@/components/legal/LegalChrome";
import { getLegalPolicy } from "@/lib/legal/policies";

export default function TermsPage() {
  return <LegalPage policy={getLegalPolicy("terms")} />;
}
