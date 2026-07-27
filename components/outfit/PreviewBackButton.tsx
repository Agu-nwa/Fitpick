"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function PreviewBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Go back"
      className="mb-5 inline-flex size-11 items-center justify-center rounded-full border border-line/80 bg-surface/85 text-cocoa shadow-sm transition hover:-translate-y-0.5 hover:border-cocoa/35 hover:bg-surface focus:outline-none focus:ring-2 focus:ring-olive/25"
    >
      <ArrowLeft className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
