"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { requestAuthOtp, verifyAuthOtp } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [expiresInMinutes, setExpiresInMinutes] = useState(10);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setNotice("");

    const result = await requestAuthOtp({ email, purpose: "signup" });
    setLoading(false);

    if (!result.ok) {
      setMessage(result.error.message || "We could not send a sign-up code right now.");
      return;
    }

    setEmail(result.data.email);
    setExpiresInMinutes(result.data.expiresInMinutes);
    setStep("code");
    setNotice("We sent a sign-up code to your email.");
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const result = await verifyAuthOtp({ email, code, purpose: "signup" });
    setLoading(false);

    if (!result.ok) {
      setMessage(result.error.message || "Invalid code. Check the code and try again.");
      return;
    }

    router.push("/home");
    router.refresh();
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-terracotta">
          {step === "email" ? "Private beta" : "Check your email"}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">
          {step === "email" ? "Create your smarter wardrobe" : "Check your email"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {step === "email"
            ? "Start with your email. No password needed."
            : `We sent a 6-digit verification code to ${email}. Enter it below to create your FitPick account.`}
        </p>
      </div>
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
            className="mt-2 h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-ink outline-none focus:border-cocoa"
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
              className="mt-2 h-12 w-full rounded-2xl border border-line bg-white px-4 text-center font-mono text-lg tracking-[0.24em] text-ink outline-none focus:border-cocoa"
              placeholder="123456"
            />
            <p className="mt-2 text-xs leading-5 text-muted">Code expires in {expiresInMinutes} minutes.</p>
          </label>
        ) : null}
        {notice ? <p className="rounded-2xl bg-success/10 px-3 py-2 text-xs leading-5 text-success">Code sent. Check your inbox.</p> : null}
        {message ? <p className="rounded-2xl bg-danger/10 px-3 py-2 text-xs leading-5 text-danger">{message}</p> : null}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (step === "email" ? "Sending code..." : "Verifying...") : step === "email" ? "Send verification code" : "Verify and create my wardrobe"}
        </Button>
      </form>
      {step === "code" ? (
        <button
          type="button"
          className="mt-3 w-full text-center text-xs font-semibold text-cocoa"
          onClick={() => {
            setStep("email");
            setCode("");
            setMessage("");
            setNotice("");
          }}
        >
          Use a different email
        </button>
      ) : null}
      <p className="mt-4 text-center text-xs leading-5 text-muted">
        Already have an account? <Link href="/login" className="font-semibold text-cocoa">Sign in</Link>
      </p>
      <div className="mt-5 rounded-2xl border border-line bg-canvas px-4 py-3">
        <p className="text-xs font-semibold text-ink">No password needed. Your wardrobe stays private.</p>
        <p className="mt-1 text-xs leading-5 text-muted">You control what you upload and can start with just a few favourite pieces.</p>
      </div>
    </Card>
  );
}
