"use client";

import { useState } from "react";
import { SyncDialog } from "@/components/SyncDialog";
import { CloudIcon, CloudOffIcon } from "@/components/icons";
import { useSync } from "@/lib/sync";

const LABELS = {
  off: "Sync off",
  connecting: "Connecting",
  syncing: "Syncing",
  synced: "Synced",
  error: "Sync error",
} as const;

export function SyncStatus() {
  const sync = useSync();
  const [open, setOpen] = useState(false);
  const label = LABELS[sync.status];
  const on = Boolean(sync.code);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={label}
        aria-label={label}
        className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2.5 py-2 text-canvas/70 transition-colors hover:bg-canvas/10 hover:text-canvas"
      >
        <span className="relative">
          {on ? <CloudIcon className="size-[18px]" /> : <CloudOffIcon className="size-[18px]" />}
          {on && (
            <span
              className={`absolute -top-0.5 -right-0.5 size-1.5 rounded-full ${
                sync.status === "error"
                  ? "bg-blush"
                  : sync.status === "synced"
                    ? "bg-peach"
                    : "animate-breathe bg-peach"
              }`}
            />
          )}
        </span>
        <span className="hidden text-sm md:inline">{label}</span>
      </button>

      <SyncDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
