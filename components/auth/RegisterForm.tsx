"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { register } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const result = await register({ name, email, password });
    setLoading(false);

    if (!result.ok) {
      setMessage(result.error.code === "INTERNAL_ERROR" ? "Account setup is not available right now. Try again soon." : "We could not create your account. Check your details and try again.");
      return;
    }

    router.push("/profile");
    router.refresh();
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-semibold text-ink">Name</span>
          <input
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-ink outline-none focus:border-cocoa"
            placeholder="Your name"
          />
        </label>
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
            autoComplete="new-password"
            required
            minLength={10}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-ink outline-none focus:border-cocoa"
            placeholder="At least 10 characters"
          />
        </label>
        {message ? <p className="rounded-2xl bg-danger/10 px-3 py-2 text-xs leading-5 text-danger">{message}</p> : null}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs leading-5 text-muted">
        Already have an account? <Link href="/login" className="font-semibold text-cocoa">Sign in</Link>
      </p>
    </Card>
  );
}
