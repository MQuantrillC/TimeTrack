export function AuthField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold tracking-[0.12em] text-ink-muted uppercase">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-ink-subtle">{hint}</span>}
    </label>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-blush bg-blush-tint px-3.5 py-2.5 text-xs text-ink"
    >
      {message}
    </p>
  );
}

/** Shown when the deployment has no database, so accounts cannot work yet. */
export function NoDatabaseNotice() {
  return (
    <div
      role="alert"
      className="rounded-lg border border-blush bg-blush-tint px-3.5 py-3 text-xs text-ink"
    >
      <p className="font-semibold">Accounts are unavailable</p>
      <p className="mt-1 text-ink-muted">
        This deployment has no database connected, so there is nowhere to store an account. The
        timer still works and keeps everything in this browser.
      </p>
      <p className="mt-2 text-ink-muted">
        Connect a Postgres database and redeploy.{" "}
        <a
          href="/api/health"
          className="font-medium text-olive underline underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          Check deployment status
        </a>
      </p>
    </div>
  );
}
