import Link from "next/link";

export default function TermsPage() {
  return (
    <main id="main-content" className="min-h-[100svh] bg-canvas px-5 py-10 text-ink">
      <section className="mx-auto max-w-3xl rounded-[28px] border border-line bg-white/88 p-6 shadow-card sm:p-8">
        <Link href="/login" className="text-sm font-semibold text-cocoa">MyFitPick</Link>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.22em] text-cocoa">Terms of Service</p>
        <h1 className="mt-2 font-editorial text-4xl font-semibold tracking-editorial text-ink">Use MyFitPick responsibly.</h1>
        <div className="mt-5 space-y-4 text-sm leading-7 text-muted">
          <p>MyFitPick helps you manage your wardrobe, receive outfit suggestions, and use AI-powered fashion previews. Recommendations are guidance only and may not be perfect.</p>
          <p>You are responsible for the photos and information you upload. Only upload content you have the right to use, and do not upload sensitive documents or private information that is not needed for styling.</p>
          <p>Paid AI actions use Credits. Credits are deducted only after the requested result is completed according to the wallet rules shown in the app.</p>
          <p>These launch terms are provided for product testing and should be reviewed by legal counsel before a wider public launch.</p>
        </div>
      </section>
    </main>
  );
}
