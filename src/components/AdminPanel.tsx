"use client";

import { useEffect, useState } from "react";
import { formatHm } from "@/lib/time";

/**
 * A read-only look at every account. The endpoint decides whether the caller is
 * allowed to see this; reaching the component proves nothing on its own.
 */

type Row = {
  name: string;
  email: string;
  createdAt: string;
  projects: number;
  sessions: number;
  trackedMs: number;
  lastSyncedAt: string | null;
};

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/users", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok) {
          setError(typeof body?.error === "string" ? body.error : "Could not load accounts.");
          return;
        }
        setRows(body.users as Row[]);
      })
      .catch(() => {
        if (!cancelled) setError("Could not reach the server.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalProjects = rows?.reduce((sum, row) => sum + row.projects, 0) ?? 0;
  const totalTracked = rows?.reduce((sum, row) => sum + row.trackedMs, 0) ?? 0;

  const when = (value: string | null) =>
    value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/25 p-4 pt-16 sm:p-6 sm:pt-24">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Accounts"
        className="relative w-full max-w-lg rounded-xl border border-line bg-surface p-6 shadow-[0_16px_40px_-12px_rgb(35_38_27/0.22)]"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-base font-semibold tracking-tight text-ink">Accounts</h2>
          {rows && (
            <p className="text-xs text-ink-muted">
              <span className="font-mono tabular-nums text-ink">{rows.length}</span>{" "}
              {rows.length === 1 ? "account" : "accounts"} ·{" "}
              <span className="font-mono tabular-nums text-ink">{totalProjects}</span> projects ·{" "}
              <span className="font-mono tabular-nums text-ink">{formatHm(totalTracked)}</span>
            </p>
          )}
        </div>

        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-blush bg-blush-tint px-3.5 py-2.5 text-xs text-ink"
            >
              {error}
            </p>
          )}

          {!rows && !error && <p className="py-6 text-center text-sm text-ink-muted">Loading…</p>}

          {rows && (
            <div className="overflow-hidden rounded-lg border border-line">
              <div className="flex items-center gap-3 border-b border-line bg-sunken/60 px-3 py-2">
                <span className="label flex-1">Account</span>
                <span className="label w-14 text-right">Projects</span>
                <span className="label w-16 text-right">Tracked</span>
                <span className="label w-10 text-right">Seen</span>
              </div>
              {rows.map((row, index) => (
                <div
                  key={row.email}
                  className={`flex items-center gap-3 px-3 py-2.5 ${
                    index > 0 ? "border-t border-line" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{row.name}</span>
                    <span className="block truncate text-xs text-ink-muted">{row.email}</span>
                  </span>
                  <span className="w-14 text-right font-mono text-sm tabular-nums text-ink">
                    {row.projects}
                  </span>
                  <span className="w-16 text-right font-mono text-sm tabular-nums text-ink">
                    {formatHm(row.trackedMs)}
                  </span>
                  <span className="w-10 text-right font-mono text-xs tabular-nums text-ink-subtle">
                    {when(row.lastSyncedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-ink-muted">
          Read-only. Nothing here changes anyone&rsquo;s data.
        </p>

        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onClose} className="btn btn-outline">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
