"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { requestAuthOtp, verifyAuthOtp } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function LoginForm() {
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

    const result = await requestAuthOtp({ email, purpose: "signin" });
    setLoading(false);

    if (!result.ok) {
      setMessage(result.error.message || "We could not send a sign-in code right now.");
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

    const result = await verifyAuthOtp({ email, code, purpose: "signin" });
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
          {step === "email" ? "Welcome back" : "Check your email"}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">
          {step === "email" ? "Continue with email" : "Enter your sign-in code"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {step === "email"
            ? "No password needed. We will send a secure code to your inbox."
            : `We sent a 6-digit sign-in code to ${email}.`}
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
        {notice ? <p className="rounded-2xl bg-success/10 px-3 py-2 text-xs leading-5 text-success">{notice}</p> : null}
        {message ? <p className="rounded-2xl bg-danger/10 px-3 py-2 text-xs leading-5 text-danger">{message}</p> : null}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (step === "email" ? "Sending code..." : "Verifying...") : step === "email" ? "Send sign-in code" : "Verify and sign in"}
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
        New to FitPick? <Link href="/register" className="font-semibold text-cocoa">Create an account</Link>
      </p>
    </Card>
  );
}
