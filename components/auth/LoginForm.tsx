import { AuthEntryForm } from "@/components/auth/AuthEntryForm";

export function LoginForm({ nextPath }: { nextPath?: string | null }) {
  return <AuthEntryForm compact initialMode="signin" showContextLink={false} nextPath={nextPath} />;
}
