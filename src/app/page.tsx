"use client";

import { useEffect, useState } from "react";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { ProjectCombobox } from "@/components/ProjectCombobox";
import { PauseIcon, PlayIcon, PlusIcon } from "@/components/icons";
import { formatClock, formatHm, formatHms, startOfDay, startOfWeek } from "@/lib/time";
import { useNow } from "@/lib/useNow";
import {
  currentSessionElapsed,
  findProject,
  isRunning,
  newSession,
  pause,
  projectTotal,
  selectProject,
  start,
  totalSince,
  useTracker,
} from "@/lib/store";

export default function TimerPage() {
  const data = useTracker();
  const running = isRunning(data);
  const now = useNow(running);
  const [dialogOpen, setDialogOpen] = useState(false);

  const project = findProject(data, data.selectedProjectId);
  const sessionElapsed = project ? currentSessionElapsed(data, now) : 0;
  const total = project ? projectTotal(data, project.id, now) : 0;

  // Space starts and pauses, unless the user is typing or a dialog is open.
  const projectId = project?.id ?? null;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (!projectId) return;
      // let the browser handle Space on anything focusable, so it never double-fires
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, a, [contenteditable]")) return;
      if (document.querySelector("[role=dialog]")) return;
      event.preventDefault();
      if (running) pause();
      else start();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [projectId, running]);

  if (!data.ready) {
    return <div className="h-[520px]" aria-hidden />;
  }

  return (
    <div className="space-y-10 sm:space-y-12">
      <section className="card px-4 py-9 sm:px-12 sm:py-14">
        <div className="mx-auto flex max-w-sm flex-col items-center">
          <span className="label">Current Project</span>

          <div className="mt-3 flex w-full items-center gap-2">
            <ProjectCombobox
              projects={data.projects}
              selectedId={data.selectedProjectId}
              onSelect={selectProject}
            />
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="btn btn-outline shrink-0 self-stretch px-3.5"
              aria-label="New project"
              title="New project"
            >
              <PlusIcon className="size-4" />
            </button>
          </div>

          <div className="mt-10 text-center sm:mt-12">
            {project ? (
              <>
                <h1 className="text-xl leading-tight font-semibold tracking-tight text-ink sm:text-[22px]">
                  {project.name}
                </h1>
                {project.description && (
                  <p className="mt-1.5 text-sm text-ink-muted">{project.description}</p>
                )}
              </>
            ) : (
              <h1 className="text-lg font-normal text-ink-subtle sm:text-[22px]">
                Select or create a project
              </h1>
            )}
          </div>

          <div
            className={`timer mt-6 text-[3.25rem] sm:mt-7 sm:text-[5rem] ${
              !project ? "text-line-strong" : running ? "text-ember" : "text-ink"
            }`}
          >
            {formatClock(sessionElapsed)}
          </div>

          <Status hasProject={Boolean(project)} running={running} />

          <div className="mt-8 flex w-full flex-col gap-2.5 sm:mt-9">
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={start}
                disabled={!project || running}
                className="btn btn-action flex-1 py-3.5 sm:py-3"
              >
                <PlayIcon className="size-3.5" />
                START
              </button>
              <button
                type="button"
                onClick={pause}
                disabled={!running}
                className="btn btn-primary flex-1 py-3.5 sm:py-3"
              >
                <PauseIcon className="size-3.5" />
                PAUSE
              </button>
            </div>
            <button
              type="button"
              onClick={newSession}
              disabled={!project}
              className="btn btn-outline py-3.5 text-ink-muted sm:py-3"
            >
              <PlusIcon className="size-4" />
              NEW SESSION
            </button>
          </div>

          {project && (
            <p className="mt-4 hidden text-xs text-ink-subtle sm:block">
              Press{" "}
              <kbd className="rounded border border-line-strong bg-sunken px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
                Space
              </kbd>{" "}
              to {running ? "pause" : "start"}
            </p>
          )}

          <dl className="mt-10 flex w-full border-t border-line pt-6 sm:mt-11">
            <Stat label="Current session" value={formatHms(sessionElapsed)} />
            <div className="w-px bg-line" />
            <Stat label="Total project time" value={formatHms(total)} />
          </dl>
        </div>
      </section>

      <section>
        <dl className="card flex divide-x divide-line">
          <Period label="Today" value={totalSince(data, startOfDay(now), now)} />
          <Period label="This week" value={totalSince(data, startOfWeek(now), now)} />
        </dl>

        <div className="mt-8 flex items-baseline justify-between px-1">
          <h2 className="label">My Projects</h2>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ember-deep"
          >
            <PlusIcon className="size-3.5" />
            New Project
          </button>
        </div>

        <div className="card mt-3 overflow-hidden">
          {data.projects.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-ink-muted">
              No projects yet. Create one to start tracking.
            </p>
          )}
          {data.projects.map((item, index) => {
            const selected = item.id === data.selectedProjectId;
            const active = selected && running;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectProject(item.id)}
                className={`relative flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors ${
                  index > 0 ? "border-t border-line" : ""
                } ${selected ? "bg-sunken/70" : "hover:bg-sunken/40"}`}
              >
                {selected && (
                  <span
                    className={`absolute inset-y-0 left-0 w-[3px] ${
                      active ? "bg-orange" : "bg-olive"
                    }`}
                  />
                )}
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span
                      className={`truncate text-sm text-ink ${
                        selected ? "font-semibold" : "font-medium"
                      }`}
                    >
                      {item.name}
                    </span>
                    {active && (
                      <span className="size-1.5 shrink-0 animate-breathe rounded-full bg-orange" />
                    )}
                  </span>
                  {item.description && (
                    <span className="mt-0.5 block truncate text-xs text-ink-muted">
                      {item.description}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-mono text-sm tabular-nums text-ink-muted">
                  {formatHm(projectTotal(data, item.id, now))}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <NewProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

function Status({ hasProject, running }: { hasProject: boolean; running: boolean }) {
  if (!hasProject) {
    return (
      <span className="mt-5 text-[11px] font-semibold tracking-[0.14em] text-ink-muted uppercase">
        No project
      </span>
    );
  }
  return (
    <span
      className={`mt-5 inline-flex items-center gap-2 rounded-full py-1 pr-3.5 pl-3 text-[11px] font-semibold tracking-[0.14em] uppercase ${
        running ? "bg-orange-tint text-ember-deep" : "bg-olive-tint text-olive"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${
          running ? "animate-breathe bg-orange" : "bg-sage"
        }`}
      />
      {running ? "Running" : "Paused"}
    </span>
  );
}

function Period({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-1 items-baseline justify-between gap-3 px-5 py-3.5">
      <dt className="text-[11px] font-semibold tracking-[0.14em] text-sage-deep uppercase">
        {label}
      </dt>
      <dd
        className={`font-mono text-sm tabular-nums ${value > 0 ? "text-ink" : "text-ink-subtle"}`}
      >
        {formatHm(value)}
      </dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 text-center">
      <dt className="text-[10px] font-semibold tracking-[0.14em] text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1.5 font-mono text-[15px] tabular-nums text-ink">{value}</dd>
    </div>
  );
}
