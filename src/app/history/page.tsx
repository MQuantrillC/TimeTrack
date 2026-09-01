"use client";

import { useState } from "react";
import { AddSessionDialog, DurationPreview } from "@/components/AddSessionDialog";
import { ProjectCombobox } from "@/components/ProjectCombobox";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/icons";
import {
  formatDateTime,
  formatDurationLabel,
  formatHm,
  formatTimeOfDay,
  fromDateTimeInput,
  dayBounds,
  toDateTimeInput,
} from "@/lib/time";
import { PERIODS, formatDayLabel, periodRange, type PeriodKey } from "@/lib/period";
import { useNow } from "@/lib/useNow";
import {
  deleteSession,
  isRunning,
  sessionHistory,
  updateSession,
  useTracker,
  type HistoryEntry,
} from "@/lib/store";

export default function HistoryPage() {
  const data = useTracker();
  const running = isRunning(data);
  const now = useNow(running);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("all");
  // how many periods back from the current one we are looking at; 0 is current
  const [offset, setOffset] = useState(0);
  // a filter for this page only — it does not change what the timer has selected
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  // a single day, chosen from the calendar; takes the place of the period pills
  const [day, setDay] = useState("");

  if (!data.ready) {
    return <div className="h-[520px]" aria-hidden />;
  }

  const dayWindow = dayBounds(day);
  const range = periodRange(period, offset, now);
  const [start, end] = dayWindow ?? [range.start, range.end];
  const label = dayWindow ? formatDayLabel(dayWindow[0], now) : range.label;

  const all = sessionHistory(data, now);
  const entries = all.filter((entry) => {
    if (projectFilter !== null && entry.projectId !== projectFilter) return false;
    if (start !== null && entry.startedAt < start) return false;
    if (end !== null && entry.startedAt >= end) return false;
    return true;
  });
  const total = entries.reduce((sum, entry) => sum + entry.duration, 0);

  const choosePeriod = (key: PeriodKey) => {
    setPeriod(key);
    setOffset(0);
    setDay("");
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-[22px]">
              History
            </h1>
            {label && (
              <span className="flex items-center gap-0.5">
                {range.navigable && !dayWindow && (
                  <button
                    type="button"
                    onClick={() => setOffset(offset - 1)}
                    aria-label="Previous period"
                    className="icon-btn size-7 text-ink-subtle hover:bg-olive-tint hover:text-olive"
                  >
                    <ChevronLeftIcon className="size-4" />
                  </button>
                )}
                <span className="text-[15px] font-normal text-ink-subtle sm:text-base">
                  {label}
                </span>
                {range.navigable && !dayWindow && (
                  <button
                    type="button"
                    onClick={() => setOffset(offset + 1)}
                    disabled={offset >= 0}
                    aria-label="Next period"
                    className="icon-btn size-7 text-ink-subtle hover:bg-olive-tint hover:text-olive disabled:pointer-events-none disabled:opacity-25"
                  >
                    <ChevronRightIcon className="size-4" />
                  </button>
                )}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {all.length > 0 ? (
              <>
                <span className="font-mono tabular-nums text-ink">{entries.length}</span>{" "}
                {entries.length === 1 ? "session" : "sessions"} ·{" "}
                <span className="font-mono tabular-nums text-ink">{formatHm(total)}</span> total
              </>
            ) : (
              "Every stretch of work, newest first."
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          disabled={data.projects.length === 0}
          className="btn btn-outline"
        >
          <PlusIcon className="size-4" />
          Add session
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-1.5">
        <ProjectCombobox
          projects={data.projects}
          selectedId={projectFilter}
          onSelect={setProjectFilter}
          includeAll
          label="Filter by project"
          className="w-full sm:w-52"
        />
        <div className="relative">
          <input
            type="date"
            value={day}
            onChange={(event) => setDay(event.target.value)}
            aria-label="Filter by a specific date"
            title="Filter by a specific date"
            className={`rounded-lg border px-3 py-1.5 text-[16px] transition-colors focus:border-olive focus:outline-none sm:text-[13px] ${
              dayWindow
                ? "border-olive font-medium text-ink ring-1 ring-olive"
                : "border-line-strong text-ink-muted hover:border-olive"
            } bg-surface ${dayWindow ? "pr-8" : ""}`}
          />
          {dayWindow && (
            <button
              type="button"
              onClick={() => setDay("")}
              aria-label="Clear the date filter"
              className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-1 text-ink-subtle transition-colors hover:bg-olive-tint hover:text-olive"
            >
              <CloseIcon className="size-3.5" />
            </button>
          )}
        </div>

        <div role="group" aria-label="Filter by period" className="flex flex-wrap gap-1.5">
          {PERIODS.map((item) => {
            // a chosen day replaces the period, so none of these read as active
            const active = item.key === period && !dayWindow;
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={active}
                onClick={() => choosePeriod(item.key)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-olive text-canvas"
                    : "border border-line-strong bg-surface text-ink-muted hover:border-olive hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card mt-3 overflow-hidden">
        {entries.length === 0 && (
          <p className="px-5 py-12 text-center text-sm text-ink-muted">
            {all.length === 0
              ? "Nothing tracked yet. Start a timer and it will show up here."
              : "No sessions match these filters."}
          </p>
        )}

        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className={`relative px-4 py-3.5 sm:px-5 ${index > 0 ? "border-t border-line" : ""} ${
              entry.running ? "bg-orange-tint/40" : ""
            }`}
          >
            {entry.running && <span className="absolute inset-y-0 left-0 w-[3px] bg-orange" />}

            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                {/* narrow: project and duration lead, timestamp underneath */}
                <div className="flex items-baseline justify-between gap-3 sm:hidden">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">
                      {entry.projectName}
                    </span>
                    {entry.running && (
                      <span className="size-1.5 shrink-0 animate-breathe rounded-full bg-orange" />
                    )}
                  </span>
                  <Duration entry={entry} />
                </div>
                <div className="mt-1 font-mono text-xs tabular-nums text-ink-muted sm:hidden">
                  {formatDateTime(entry.startedAt)}
                  {entry.endedAt !== null && !entry.running && (
                    <span className="text-ink-subtle"> → {formatTimeOfDay(entry.endedAt)}</span>
                  )}
                </div>

                {/* wide: three aligned columns */}
                <div className="hidden items-baseline gap-5 sm:flex">
                  <span className="w-[11.5rem] shrink-0 font-mono text-[13px] tabular-nums text-ink-muted">
                    {formatDateTime(entry.startedAt)}
                  </span>
                  <span className="min-w-0 flex-1">
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
                  <Duration entry={entry} />
                </div>
              </div>

              <div className="flex shrink-0 gap-0.5">
                <button
                  type="button"
                  disabled={entry.running}
                  onClick={() => {
                    setConfirmingId(null);
                    setEditingId(editingId === entry.id ? null : entry.id);
                  }}
                  aria-label={`Edit the ${entry.projectName} session`}
                  title={entry.running ? "Pause the timer to edit this session" : "Edit times"}
                  className="icon-btn text-ink-subtle hover:bg-olive-tint hover:text-olive disabled:pointer-events-none disabled:opacity-30"
                >
                  <PencilIcon className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setConfirmingId(confirmingId === entry.id ? null : entry.id);
                  }}
                  aria-label={`Delete the ${entry.projectName} session`}
                  title="Delete session"
                  className="icon-btn text-ink-subtle hover:bg-blush-tint hover:text-mauve"
                >
                  <TrashIcon className="size-4" />
                </button>
              </div>
            </div>

            {editingId === entry.id && (
              <EditSession entry={entry} onDone={() => setEditingId(null)} />
            )}

            {confirmingId === entry.id && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blush bg-blush-tint px-4 py-3">
                <span className="text-xs text-ink">
                  Delete this session? It removes{" "}
                  <span className="font-mono">{formatDurationLabel(entry.duration)}</span> from{" "}
                  <span className="font-semibold">{entry.projectName}</span>.
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setConfirmingId(null)}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteSession(entry.id);
                      setConfirmingId(null);
                    }}
                    className="btn btn-danger px-3 py-1.5 text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <AddSessionDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function Duration({ entry }: { entry: HistoryEntry }) {
  return (
    <span
      className={`shrink-0 font-mono text-[13px] tabular-nums ${
        entry.running ? "text-ember" : "text-ink"
      }`}
    >
      {formatDurationLabel(entry.duration)}
    </span>
  );
}

function EditSession({ entry, onDone }: { entry: HistoryEntry; onDone: () => void }) {
  const [start, setStart] = useState(toDateTimeInput(entry.startedAt));
  const [end, setEnd] = useState(
    toDateTimeInput(entry.endedAt ?? entry.startedAt + entry.duration),
  );

  const startedAt = fromDateTimeInput(start);
  const endedAt = fromDateTimeInput(end);
  const valid = startedAt !== null && endedAt !== null && endedAt > startedAt;

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    updateSession(entry.id, startedAt, endedAt);
    onDone();
  };

  return (
    <form onSubmit={save} className="mt-3 rounded-lg border border-line bg-sunken/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="mb-1.5 block text-[10px] font-semibold tracking-[0.12em] text-ink-muted uppercase">
            Started
          </span>
          <input
            type="datetime-local"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            className="input"
            autoFocus
          />
        </label>
        <label className="flex-1">
          <span className="mb-1.5 block text-[10px] font-semibold tracking-[0.12em] text-ink-muted uppercase">
            Ended
          </span>
          <input
            type="datetime-local"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            className="input"
          />
        </label>
      </div>

      <div className="mt-3">
        <DurationPreview startedAt={startedAt} endedAt={endedAt} />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onDone} className="btn btn-ghost">
          Cancel
        </button>
        <button type="submit" disabled={!valid} className="btn btn-primary">
          Save
        </button>
      </div>
    </form>
  );
}
