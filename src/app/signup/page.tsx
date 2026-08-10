"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthError, AuthField } from "@/components/AuthField";
import { signUp, useAccount } from "@/lib/account";

export default function SignUpPage() {
  const account = useAccount();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const problem = await signUp({ firstName, lastName, email, password });
    setBusy(false);
    if (problem) setError(problem);
    else router.push("/");
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-[22px]">
        Create your account
      </h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        Your projects will sync to every device you sign in on.
      </p>

      <form onSubmit={submit} className="card mt-6 space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <AuthField label="First name">
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="input"
                autoComplete="given-name"
                autoFocus
              />
            </AuthField>
          </div>
          <div className="flex-1">
            <AuthField label="Last name">
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="input"
                autoComplete="family-name"
              />
            </AuthField>
          </div>
        </div>

        <AuthField label="Email">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input"
            autoComplete="email"
          />
        </AuthField>

        <AuthField label="Password" hint="At least 8 characters.">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input"
            autoComplete="new-password"
          />
        </AuthField>

        {error && <AuthError message={error} />}
        {!account.accountsAvailable && (
          <AuthError message="This deployment has no database configured, so accounts are unavailable." />
        )}

        <button type="submit" disabled={busy} className="btn btn-primary w-full py-3">
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/signin" className="font-medium text-olive underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
