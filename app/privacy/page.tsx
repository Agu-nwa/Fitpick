import { LegalPage } from "@/components/legal/LegalChrome";
import { getLegalPolicy } from "@/lib/legal/policies";

export default function PrivacyPage() {
  return <LegalPage policy={getLegalPolicy("privacy")} />;
}
