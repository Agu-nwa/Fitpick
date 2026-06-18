"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { login } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

function friendlyLoginError() {
  return "We could not sign you in. Check your details and try again.";
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const result = await login({ email, password });
    setLoading(false);

    if (!result.ok) {
      setMessage(result.error.code === "INTERNAL_ERROR" ? "Sign in is not available right now. Try again soon." : friendlyLoginError());
      return;
    }

    router.push("/profile");
    router.refresh();
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-semibold text-ink">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-ink outline-none focus:border-cocoa"
            placeholder="you@example.com"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-ink outline-none focus:border-cocoa"
            placeholder="Your password"
          />
        </label>
        {message ? <p className="rounded-2xl bg-danger/10 px-3 py-2 text-xs leading-5 text-danger">{message}</p> : null}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs leading-5 text-muted">
        New to FitPick? <Link href="/register" className="font-semibold text-cocoa">Create an account</Link>
      </p>
    </Card>
  );
}
