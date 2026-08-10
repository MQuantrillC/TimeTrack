"use client";

import { formatDateTime, formatDurationLabel, formatHm, formatTimeOfDay } from "@/lib/time";
import { useNow } from "@/lib/useNow";
import { isRunning, sessionHistory, useTracker } from "@/lib/store";

export default function HistoryPage() {
  const data = useTracker();
  const running = isRunning(data);
  const now = useNow(running);

  if (!data.ready) {
    return <div className="h-[520px]" aria-hidden />;
  }

  const entries = sessionHistory(data, now);
  const total = entries.reduce((sum, entry) => sum + entry.duration, 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">History</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Every stretch of work, newest first.
          </p>
        </div>
        {entries.length > 0 && (
          <p className="text-sm text-ink-muted">
            <span className="font-mono tabular-nums text-ink">{entries.length}</span> sessions ·{" "}
            <span className="font-mono tabular-nums text-ink">{formatHm(total)}</span> total
          </p>
        )}
      </div>

      <div className="card mt-8 overflow-hidden">
        {entries.length === 0 && (
          <p className="px-5 py-12 text-center text-sm text-ink-muted">
            Nothing tracked yet. Start a timer and it will show up here.
          </p>
        )}

        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className={`relative flex flex-wrap items-baseline gap-x-5 gap-y-1 px-5 py-3.5 sm:flex-nowrap ${
              index > 0 ? "border-t border-line" : ""
            } ${entry.running ? "bg-orange-tint/40" : ""}`}
          >
            {entry.running && <span className="absolute inset-y-0 left-0 w-[3px] bg-orange" />}

            <span className="w-[11.5rem] shrink-0 font-mono text-[13px] tabular-nums text-ink-muted">
              {formatDateTime(entry.startedAt)}
            </span>

            <span className="min-w-0 flex-1 basis-full sm:basis-auto">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-ink">
                  {entry.projectName}
                </span>
                {entry.running && (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-orange-tint px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] text-ember-deep uppercase">
                    <span className="size-1.5 animate-breathe rounded-full bg-orange" />
                    Running
                  </span>
                )}
              </span>
              {entry.endedAt !== null && !entry.running && (
                <span className="mt-0.5 block text-xs text-ink-subtle">
                  until {formatTimeOfDay(entry.endedAt)}
                </span>
              )}
            </span>

            <span
              className={`shrink-0 font-mono text-[13px] tabular-nums ${
                entry.running ? "text-ember" : "text-ink"
              }`}
            >
              {formatDurationLabel(entry.duration)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
