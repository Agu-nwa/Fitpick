"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { requestAuthOtp, verifyAuthOtp } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { safeUserMessage } from "@/lib/user-facing-errors";

type Step = "email" | "code";
type AuthMode = "signin" | "signup";

function friendlyAuthError(error?: unknown) {
  const message = typeof error === "string"
    ? error
    : error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";
  if (!message) return "Something went wrong. Please try again.";
  if (/expired/i.test(message)) return "That code has expired. Request a new one and try again.";
  if (/too many/i.test(message)) return "Too many incorrect attempts. Request a new code.";
  if (/invalid|code/i.test(message)) return "That code does not look right. Check it and try again.";
  if (/unable to send/i.test(message)) return "We could not send a code right now. Please try again shortly.";
  return safeUserMessage(error instanceof Error ? error : message, "Something went wrong. Please try again.");
}

function safeNextPath(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/api/")) return "/home";
  if (value === "/login" || value === "/register") return "/home";
  return value;
}

export function AuthEntryForm({
  compact = false,
  initialMode = "signin",
  showContextLink = true,
  nextPath: nextPathInput
}: {
  compact?: boolean;
  initialMode?: AuthMode;
  showContextLink?: boolean;
  nextPath?: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [expiresInMinutes, setExpiresInMinutes] = useState(10);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");

  const nextPath = safeNextPath(nextPathInput);

  async function requestCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    setMessage("");
    setNotice("");

    const result = await requestAuthOtp({ email, purpose: mode });
    setLoading(false);

    if (!result.ok) {
      setMessage(friendlyAuthError(result.error));
      return;
    }

    setEmail(result.data.email);
    setExpiresInMinutes(result.data.expiresInMinutes);
    setStep("code");
    setNotice("Code sent. Check your inbox.");
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setNotice("");

    const result = await verifyAuthOtp({ email, code, purpose: mode });
    setLoading(false);

    if (!result.ok) {
      setMessage(friendlyAuthError(result.error));
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <div className={compact ? "mt-5 w-full rounded-[28px] border border-line bg-white/88 p-5 shadow-card backdrop-blur-xl sm:p-6" : "w-full rounded-[28px] border border-line bg-white/88 p-5 shadow-card backdrop-blur-xl sm:p-6"}>
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cocoa">MyFitPick</p>
        <h2 className="mt-2 font-editorial text-3xl font-semibold leading-tight tracking-editorial text-ink sm:text-4xl">
          {step === "code" ? "Check your email" : mode === "signup" ? "Create your MyFitPick account" : "Welcome back"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {step === "code" ? `Enter the 6-digit code sent to ${email}.` : "Enter your email to continue securely."}
        </p>
      </div>

      {step === "email" ? (
        <div className="mt-5 grid grid-cols-2 rounded-2xl border border-line bg-canvas/70 p-1">
          {(["signin", "signup"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={`focus-ring h-10 rounded-xl text-sm font-semibold transition ${mode === item ? "bg-cocoa text-canvas shadow-card" : "text-muted hover:text-ink"}`}
              onClick={() => {
                setMode(item);
                setMessage("");
                setNotice("");
              }}
            >
              {item === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={step === "email" ? requestCode : verifyCode} className="mt-4 space-y-4">
        <label className="block">
          <span className="text-sm font-semibold text-ink">Email address</span>
          <input
            type="email"
            autoComplete="email"
            required
            disabled={step === "code"}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 h-12 w-full rounded-2xl border border-line bg-canvas/70 px-4 text-base text-ink outline-none shadow-inner transition placeholder:text-muted/70 focus:border-cocoa focus:bg-white disabled:cursor-not-allowed disabled:opacity-75"
            placeholder="you@example.com"
          />
        </label>

        {step === "code" ? (
          <label className="block">
            <span className="text-sm font-semibold text-ink">Verification code</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-2 h-12 w-full rounded-2xl border border-line bg-canvas/70 px-4 text-center font-mono text-lg tracking-[0.24em] text-ink outline-none shadow-inner transition focus:border-cocoa focus:bg-white"
              placeholder="123456"
            />
            <p className="mt-2 text-xs leading-5 text-muted">Code expires in {expiresInMinutes} minutes.</p>
          </label>
        ) : null}

        {notice ? <p className="rounded-2xl bg-success/10 px-3 py-2 text-xs leading-5 text-success">{notice}</p> : null}
        {message ? <p className="rounded-2xl bg-danger/10 px-3 py-2 text-xs leading-5 text-danger">{message}</p> : null}

        <Button type="submit" disabled={loading} className="h-12 w-full rounded-2xl">
          {loading ? (step === "email" ? "Sending code..." : "Verifying...") : step === "email" ? "Continue" : "Verify code"}
        </Button>
      </form>

      {step === "code" ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="focus-ring rounded-2xl px-3 py-2 text-xs font-semibold text-cocoa disabled:opacity-50"
            onClick={() => void requestCode()}
            disabled={loading}
          >
            Resend code
          </button>
          <button
            type="button"
            className="focus-ring rounded-2xl px-3 py-2 text-xs font-semibold text-cocoa"
            onClick={() => {
              setStep("email");
              setCode("");
              setMessage("");
              setNotice("");
            }}
          >
            Change email
          </button>
        </div>
      ) : null}

      <p className="mt-4 text-center text-[11px] leading-5 text-muted">
        By continuing, you agree to MyFitPick&apos;s{" "}
        <Link href="/legal/terms" className="font-semibold text-cocoa">Terms of Service</Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="font-semibold text-cocoa">Privacy Policy</Link>.
      </p>

      {showContextLink ? (
        <p className="mt-2 text-center text-xs leading-5 text-muted">
          Need context first? <Link href="/onboarding" className="font-semibold text-cocoa">See how MyFitPick works</Link>
        </p>
      ) : null}
    </div>
  );
}
