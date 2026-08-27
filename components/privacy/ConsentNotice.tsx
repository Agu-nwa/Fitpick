import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import {
  hasAiProcessingConsent,
  hasPhotoStorageConsent
} from "@/lib/privacy/privacy-preferences";

export async function ConsentNotice({ requirePhotos = false, requireAi = false }: { requirePhotos?: boolean; requireAi?: boolean }) {
  const auth = await requireUser();
  if (!auth.ok) return null;
  const [photosAllowed, aiAllowed] = await Promise.all([
    requirePhotos ? hasPhotoStorageConsent(auth.user._id) : Promise.resolve(true),
    requireAi ? hasAiProcessingConsent(auth.user._id) : Promise.resolve(true)
  ]);
  const missing = [
    !photosAllowed ? "private photo storage" : "",
    !aiAllowed ? "AI photo and prompt processing" : ""
  ].filter(Boolean);
  if (!missing.length) return null;

  return (
    <div className="mb-5 flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-ink" role="status">
      <AlertTriangle className="mt-0.5 shrink-0 text-warning" size={19} aria-hidden="true" />
      <div>
        <p className="font-semibold">Your privacy choice is needed before this feature can run.</p>
        <p className="mt-1 leading-6 text-muted">
          Review and allow {missing.join(" and ")}. MyFitPick records each choice separately, and you can withdraw it later.
        </p>
        <Link href="/profile?section=privacy" className="mt-2 inline-flex min-h-10 items-center font-bold text-cocoa underline underline-offset-4">
          Review privacy choices
        </Link>
      </div>
    </div>
  );
}
