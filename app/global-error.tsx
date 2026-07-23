"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen items-center justify-center px-6">
          <section className="w-full max-w-md text-center">
            <h1 className="text-3xl font-semibold">
              FitPick needs a quick refresh
            </h1>

            <p className="mt-4 text-gray-600">
              We could not finish loading this version of FitPick.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-full bg-black px-6 py-3 text-white"
              >
                Reload FitPick
              </button>

              <button
                type="button"
                onClick={reset}
                className="rounded-full border border-gray-300 px-6 py-3"
              >
                Try again
              </button>
            </div>

            {process.env.NODE_ENV === "development" ? (
              <p className="mt-6 rounded-2xl bg-gray-100 px-4 py-3 text-xs text-gray-600">
                Details were captured in the development console.
              </p>
            ) : null}
          </section>
        </main>
      </body>
    </html>
  );
}
