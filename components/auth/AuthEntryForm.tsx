"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { requestAuthOtp, verifyAuthOtp } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

type Step = "email" | "code";
type AuthMode = "signin" | "signup";

function friendlyAuthError(message?: string) {
  if (!message) return "Something went wrong. Please try again.";
  if (/expired/i.test(message)) return "That code has expired. Request a new one and try again.";
  if (/too many/i.test(message)) return "Too many incorrect attempts. Request a new code.";
  if (/invalid|code/i.test(message)) return "That code does not look right. Check it and try again.";
  if (/unable to send/i.test(message)) return "We could not send a code right now. Please try again shortly.";
  return message;
}

export function AuthEntryForm({ compact = false, initialMode = "signin" }: { compact?: boolean; initialMode?: AuthMode }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [expiresInMinutes, setExpiresInMinutes] = useState(10);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");

  async function requestCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    setMessage("");
    setNotice("");

    const result = await requestAuthOtp({ email, purpose: mode });
    setLoading(false);

    if (!result.ok) {
      setMessage(friendlyAuthError(result.error.message));
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
      setMessage(friendlyAuthError(result.error.message));
      return;
    }

    router.push("/home");
    router.refresh();
  }

  return (
    <div className={compact ? "mt-6 w-full rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-6" : "w-full rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-6"}>
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-terracotta">
          {step === "email" ? (mode === "signin" ? "Welcome back" : "MyFitPick") : "Check your email"}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">
          {step === "email" ? (mode === "signin" ? "Sign in to MyFitPick" : "Create your account") : "Enter your code"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {step === "email"
            ? mode === "signin"
              ? "Use the email connected to your wardrobe."
              : "New here? Start with your email. We will send a secure code."
            : `We sent a 6-digit code to ${email}.`}
        </p>
      </div>

      {step === "email" ? (
        <div className="mb-4 grid grid-cols-2 rounded-2xl border border-line bg-canvas/70 p-1">
          {(["signin", "signup"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={`focus-ring h-10 rounded-xl text-sm font-semibold transition ${mode === item ? "bg-cocoa text-canvas shadow-card" : "text-muted"}`}
              onClick={() => {
                setMode(item);
                setMessage("");
                setNotice("");
              }}
            >
              {item === "signin" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={step === "email" ? requestCode : verifyCode} className="space-y-4">
        <label className="block">
          <span className="text-sm font-semibold text-ink">Email address</span>
          <input
            type="email"
            autoComplete="email"
            required
            disabled={step === "code"}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 h-12 w-full rounded-2xl border border-line bg-canvas/70 px-4 text-base text-ink outline-none shadow-inner transition focus:border-cocoa"
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
              className="mt-2 h-12 w-full rounded-2xl border border-line bg-canvas/70 px-4 text-center font-mono text-lg tracking-[0.24em] text-ink outline-none shadow-inner transition focus:border-cocoa"
              placeholder="123456"
            />
            <p className="mt-2 text-xs leading-5 text-muted">Code expires in {expiresInMinutes} minutes.</p>
          </label>
        ) : null}

        {notice ? <p className="rounded-2xl bg-success/10 px-3 py-2 text-xs leading-5 text-success">{notice}</p> : null}
        {message ? <p className="rounded-2xl bg-danger/10 px-3 py-2 text-xs leading-5 text-danger">{message}</p> : null}

        <Button type="submit" disabled={loading} className="h-12 w-full">
          {loading ? (step === "email" ? "Sending code..." : "Verifying...") : step === "email" ? (mode === "signin" ? "Send sign-in code" : "Send sign-up code") : "Verify email"}
        </Button>
      </form>

      {step === "code" ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="focus-ring rounded-2xl px-3 py-2 text-xs font-semibold text-cocoa"
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

      <p className="mt-4 text-center text-xs leading-5 text-muted">
        Only you can see the wardrobe you add.
      </p>
      <p className="mt-2 text-center text-xs leading-5 text-muted">
        Need context first? <Link href="/onboarding" className="font-semibold text-cocoa">See how MyFitPick works</Link>
      </p>
    </div>
  );
}
