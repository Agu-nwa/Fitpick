import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main id="main-content" className="min-h-[100svh] bg-canvas px-5 py-10 text-ink">
      <section className="mx-auto max-w-3xl rounded-[28px] border border-line bg-white/88 p-6 shadow-card sm:p-8">
        <Link href="/login" className="text-sm font-semibold text-cocoa">MyFitPick</Link>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.22em] text-cocoa">Privacy Policy</p>
        <h1 className="mt-2 font-editorial text-4xl font-semibold tracking-editorial text-ink">Your wardrobe stays personal.</h1>
        <div className="mt-5 space-y-4 text-sm leading-7 text-muted">
          <p>MyFitPick uses your account details, wardrobe photos, model setup photo, Style DNA, and Credits activity to provide wardrobe management, recommendations, and previews.</p>
          <p>Email OTP sign-in is used to verify your identity and create a MyFitPick session. MyFitPick stores only hashed verification codes while they are active.</p>
          <p>Photos may be processed by configured AI and storage providers such as OpenAI, FASHN, S3, and CloudFront when you use related features.</p>
          <p>This launch privacy notice is intended for beta testing and should be reviewed by legal counsel before a wider public launch.</p>
        </div>
      </section>
    </main>
  );
}
