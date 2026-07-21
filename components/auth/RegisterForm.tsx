import { AuthEntryForm } from "@/components/auth/AuthEntryForm";

export function RegisterForm({ nextPath }: { nextPath?: string | null }) {
  return <AuthEntryForm compact initialMode="signup" showContextLink={false} nextPath={nextPath} />;
}
