"use client";

import { useEffect, useState } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { addSession, useTracker } from "@/lib/store";
import { formatDurationLabel, fromDateTimeInput, toDateTimeInput } from "@/lib/time";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AddSessionDialog({ open, onClose }: Props) {
  return open ? <Dialog onClose={onClose} /> : null;
}

function Dialog({ onClose }: { onClose: () => void }) {
  const data = useTracker();
  const [projectId, setProjectId] = useState(data.selectedProjectId ?? data.projects[0]?.id ?? "");
  // defaults to the hour just gone, which is usually close to what is being logged
  const [start, setStart] = useState(() => toDateTimeInput(Date.now() - 3_600_000));
  const [end, setEnd] = useState(() => toDateTimeInput(Date.now()));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const startedAt = fromDateTimeInput(start);
  const endedAt = fromDateTimeInput(end);
  const valid = Boolean(projectId) && startedAt !== null && endedAt !== null && endedAt > startedAt;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    addSession(projectId, startedAt!, endedAt!);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/25 p-4 pt-20 sm:p-6 sm:pt-28">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add session"
        className="relative w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-[0_16px_40px_-12px_rgb(35_38_27/0.22)] sm:p-7"
      >
        <h2 className="text-base font-semibold tracking-tight text-ink">Add a session</h2>
        <p className="mt-1 text-sm text-ink-muted">
          For work you did away from the timer.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Project">
            <div className="relative">
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="select"
              >
                {data.projects.length === 0 && <option value="">No projects yet</option>}
                {data.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-subtle" />
            </div>
          </Field>

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <Field label="Started">
                <input
                  type="datetime-local"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                  className="input"
                />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Ended">
                <input
                  type="datetime-local"
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                  className="input"
                />
              </Field>
            </div>
          </div>

          <DurationPreview startedAt={startedAt} endedAt={endedAt} />

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={!valid} className="btn btn-primary">
              Save session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DurationPreview({
  startedAt,
  endedAt,
}: {
  startedAt: number | null;
  endedAt: number | null;
}) {
  if (startedAt === null || endedAt === null) {
    return <p className="text-xs text-ink-subtle">Fill in both times.</p>;
  }
  if (endedAt <= startedAt) {
    return (
      <p className="rounded-lg border border-blush bg-blush-tint px-3.5 py-2.5 text-xs text-ink">
        The end time has to come after the start time.
      </p>
    );
  }
  return (
    <p className="text-xs text-ink-muted">
      That records{" "}
      <span className="font-mono text-ink">{formatDurationLabel(endedAt - startedAt)}</span>.
    </p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold tracking-[0.12em] text-ink-muted uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
