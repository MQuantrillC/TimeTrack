"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthError, AuthField, NoDatabaseNotice } from "@/components/AuthField";
import { signIn, useAccount } from "@/lib/account";

export default function SignInPage() {
  const account = useAccount();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const problem = await signIn(email, password);
    setBusy(false);
    if (problem) setError(problem);
    else router.push("/");
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-[22px]">Sign in</h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        Pick up where you left off on any device.
      </p>

      <form onSubmit={submit} className="card mt-6 space-y-4 p-5 sm:p-6">
        <AuthField label="Email">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input"
            autoComplete="email"
            autoFocus
          />
        </AuthField>

        <AuthField label="Password">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input"
            autoComplete="current-password"
          />
        </AuthField>

        {error && <AuthError message={error} />}
        {!account.accountsAvailable && <NoDatabaseNotice />}

        <button type="submit" disabled={busy} className="btn btn-primary w-full py-3">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-muted">
        New here?{" "}
        <Link href="/signup" className="font-medium text-olive underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
