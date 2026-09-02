"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminPanel } from "@/components/AdminPanel";
import { RefreshIcon, UsersIcon } from "@/components/icons";
import { signOut, syncNow, useAccount } from "@/lib/account";

const SYNC_LABEL = {
  off: "Not syncing",
  syncing: "Syncing…",
  synced: "Synced",
  error: "Sync problem",
} as const;

export function AccountMenu() {
  const account = useAccount();
  const [open, setOpen] = useState(false);

  if (!account.ready) {
    return <span className="h-9 w-20" aria-hidden />;
  }

  if (!account.user) {
    return (
      <Link
        href="/signin"
        className="rounded-lg px-3 py-1.5 text-sm text-canvas/80 transition-colors hover:bg-canvas/10 hover:text-canvas"
      >
        Sign in
      </Link>
    );
  }

  const initials = `${account.user.firstName[0] ?? ""}${account.user.lastName[0] ?? ""}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`${account.user.firstName} ${account.user.lastName} — ${SYNC_LABEL[account.status]}`}
        className="inline-flex min-h-9 items-center gap-2 rounded-lg py-1 pr-2.5 pl-1 transition-colors hover:bg-canvas/10"
      >
        <span className="relative">
          <span className="flex size-7 items-center justify-center rounded-full bg-canvas/15 text-[11px] font-semibold text-canvas uppercase">
            {initials}
          </span>
          <span
            className={`absolute -right-0.5 -bottom-0.5 size-2 rounded-full ring-2 ring-olive ${
              account.status === "error"
                ? "bg-blush"
                : account.status === "synced"
                  ? "bg-peach"
                  : "animate-breathe bg-peach"
            }`}
          />
        </span>
        <span className="hidden text-sm text-canvas/85 sm:inline">
          {account.user.firstName}
        </span>
      </button>

      {open && <AccountDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function AccountDialog({ onClose }: { onClose: () => void }) {
  const account = useAccount();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    // the admin panel brings its own Escape handling
    if (adminOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, adminOpen]);

  if (!account.user) return null;
  if (adminOpen) return <AdminPanel onClose={() => setAdminOpen(false)} />;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/25 p-4 pt-20 sm:p-6 sm:pt-28">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Account"
        className="relative w-full max-w-sm rounded-xl border border-line bg-surface p-6 shadow-[0_16px_40px_-12px_rgb(35_38_27/0.22)]"
      >
        <h2 className="text-base font-semibold tracking-tight text-ink">
          {account.user.firstName} {account.user.lastName}
        </h2>
        <p className="mt-0.5 text-sm break-all text-ink-muted">{account.user.email}</p>

        <div className="mt-5 flex items-center justify-between rounded-lg border border-line bg-sunken/60 px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-ink">
            <span
              className={`size-1.5 rounded-full ${
                account.status === "error"
                  ? "bg-mauve"
                  : account.status === "synced"
                    ? "bg-sage"
                    : "animate-breathe bg-orange"
              }`}
            />
            {SYNC_LABEL[account.status]}
          </span>
          <button
            type="button"
            onClick={syncNow}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <RefreshIcon className="size-3.5" />
            Sync now
          </button>
        </div>

        {account.message && (
          <p className="mt-3 rounded-lg border border-blush bg-blush-tint px-3.5 py-2.5 text-xs text-ink">
            {account.message}
          </p>
        )}

        {account.admin && (
          <button
            type="button"
            onClick={() => setAdminOpen(true)}
            className="mt-3 flex w-full items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink transition-colors hover:border-olive hover:bg-olive-tint/40"
          >
            <span className="flex items-center gap-2">
              <UsersIcon className="size-4 text-olive" />
              Accounts
            </span>
            <span className="text-xs text-ink-muted">Projects and time per account</span>
          </button>
        )}

        <p className="mt-4 text-xs text-ink-muted">
          Signing out clears this device. Your projects stay in your account.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Close
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await signOut();
              setBusy(false);
              onClose();
              router.push("/");
            }}
            className="btn btn-outline"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
