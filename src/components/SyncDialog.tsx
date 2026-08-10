"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, RefreshIcon } from "@/components/icons";
import { formatSyncCode } from "@/lib/id";
import { connectWithCode, disconnect, enableSync, syncNow, useSync } from "@/lib/sync";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SyncDialog({ open, onClose }: Props) {
  return open ? <Dialog onClose={onClose} /> : null;
}

function Dialog({ onClose }: { onClose: () => void }) {
  const sync = useSync();
  const [entry, setEntry] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showConnect, setShowConnect] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const copy = async () => {
    if (!sync.code) return;
    try {
      await navigator.clipboard.writeText(formatSyncCode(sync.code));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const connect = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const ok = await connectWithCode(entry);
    setBusy(false);
    if (ok) {
      setEntry("");
      setShowConnect(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/25 p-4 pt-20 sm:p-6 sm:pt-28">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sync"
        className="relative w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-[0_16px_40px_-12px_rgb(35_38_27/0.22)] sm:p-7"
      >
        <h2 className="text-base font-semibold tracking-tight text-ink">Sync across devices</h2>

        {sync.code ? (
          <>
            <p className="mt-1 text-sm text-ink-muted">
              This device is syncing. Enter the code below on another device to see the same
              projects there.
            </p>

            <div className="mt-5 rounded-lg border border-line bg-sunken/60 p-4">
              <span className="text-[11px] font-semibold tracking-[0.14em] text-ink-muted uppercase">
                Your sync code
              </span>
              <div className="mt-2 flex items-center gap-3">
                <code className="min-w-0 flex-1 font-mono text-[15px] break-all text-ink">
                  {formatSyncCode(sync.code)}
                </code>
                <button
                  type="button"
                  onClick={copy}
                  aria-label="Copy sync code"
                  className="btn btn-outline shrink-0 px-3 py-2"
                >
                  {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                </button>
              </div>
            </div>

            <p className="mt-3 text-xs text-ink-muted">
              Anyone with this code can read and change your data. Treat it like a password.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  disconnect();
                  onClose();
                }}
                className="btn btn-ghost"
              >
                Stop syncing
              </button>
              <button type="button" onClick={syncNow} className="btn btn-outline">
                <RefreshIcon className="size-4" />
                Sync now
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-muted">
              Your data lives in this browser. Turn on sync to keep it in step across your
              devices — no account, just a code.
            </p>

            {!showConnect ? (
              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={busy || sync.status === "connecting"}
                  onClick={async () => {
                    setBusy(true);
                    await enableSync();
                    setBusy(false);
                  }}
                  className="btn btn-primary py-3"
                >
                  Turn on sync
                </button>
                <button
                  type="button"
                  onClick={() => setShowConnect(true)}
                  className="btn btn-outline py-3"
                >
                  I already have a code
                </button>
              </div>
            ) : (
              <form onSubmit={connect} className="mt-6">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold tracking-[0.12em] text-ink-muted uppercase">
                    Sync code
                  </span>
                  <input
                    value={entry}
                    onChange={(event) => setEntry(event.target.value)}
                    placeholder="kfn3-8pqz-2wtd-6hxs"
                    className="input font-mono"
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
                <p className="mt-2 text-xs text-ink-muted">
                  This replaces the data currently in this browser.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConnect(false)}
                    className="btn btn-ghost"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={busy || !entry.trim()}
                    className="btn btn-primary"
                  >
                    Connect
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {sync.message && (
          <p className="mt-5 rounded-lg border border-blush bg-blush-tint px-3.5 py-2.5 text-xs text-ink">
            {sync.message}
          </p>
        )}
      </div>
    </div>
  );
}
