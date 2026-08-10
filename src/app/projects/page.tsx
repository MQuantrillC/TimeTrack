"use client";

import { useState } from "react";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { formatHm } from "@/lib/time";
import { useNow } from "@/lib/useNow";
import {
  deleteProject,
  isRunning,
  projectTotal,
  selectProject,
  updateProject,
  useTracker,
} from "@/lib/store";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  const data = useTracker();
  const running = isRunning(data);
  const now = useNow(running);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (!data.ready) {
    return <div className="h-[520px]" aria-hidden />;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-[22px]">
            Projects
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {data.projects.length} {data.projects.length === 1 ? "project" : "projects"} tracked
          </p>
        </div>
        <button type="button" onClick={() => setDialogOpen(true)} className="btn btn-primary">
          <PlusIcon className="size-4" />
          New Project
        </button>
      </div>

      <div className="card mt-6 overflow-hidden sm:mt-8">
        <div className="flex items-center justify-between border-b border-line bg-sunken/50 px-5 py-3">
          <span className="label">Project</span>
          <span className="label">Total time</span>
        </div>

        {data.projects.length === 0 && (
          <p className="px-5 py-12 text-center text-sm text-ink-muted">
            No projects yet. Create one to start tracking.
          </p>
        )}

        {data.projects.map((project, index) =>
          editingId === project.id ? (
            <EditRow
              key={project.id}
              project={project}
              divided={index > 0}
              onDone={() => setEditingId(null)}
            />
          ) : (
            <div
              key={project.id}
              className={`group relative px-5 py-4 ${index > 0 ? "border-t border-line" : ""}`}
            >
              {project.id === data.selectedProjectId && (
                <span
                  className={`absolute inset-y-0 left-0 w-[3px] ${
                    running ? "bg-orange" : "bg-olive"
                  }`}
                />
              )}
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => selectProject(project.id)}
                  className="min-w-0 flex-1 text-left"
                  title="Select in timer"
                >
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">{project.name}</span>
                    {project.id === data.selectedProjectId && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] uppercase ${
                          running ? "bg-orange-tint text-ember-deep" : "bg-olive-tint text-olive"
                        }`}
                      >
                        {running ? "Running" : "Selected"}
                      </span>
                    )}
                  </span>
                  {project.description && (
                    <span className="mt-0.5 block truncate text-xs text-ink-muted">
                      {project.description}
                    </span>
                  )}
                </button>

                <span className="shrink-0 font-mono text-sm tabular-nums text-ink">
                  {formatHm(projectTotal(data, project.id, now))}
                </span>

                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmingId(null);
                      setEditingId(project.id);
                    }}
                    aria-label={`Rename ${project.name}`}
                    title="Rename"
                    className="icon-btn text-ink-subtle hover:bg-olive-tint hover:text-olive"
                  >
                    <PencilIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingId(project.id)}
                    aria-label={`Delete ${project.name}`}
                    title="Delete"
                    className="icon-btn text-ink-subtle hover:bg-blush-tint hover:text-mauve"
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </div>
              </div>

              {confirmingId === project.id && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blush bg-blush-tint px-4 py-3">
                  <span className="text-xs text-ink">
                    Delete <span className="font-semibold">{project.name}</span> and all of its
                    recorded sessions?
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
                        deleteProject(project.id);
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
          ),
        )}
      </div>

      <NewProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

function EditRow({
  project,
  divided,
  onDone,
}: {
  project: Project;
  divided: boolean;
  onDone: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    updateProject(project.id, name, description);
    onDone();
  };

  return (
    <form
      onSubmit={save}
      className={`flex flex-col gap-2 bg-sunken/50 px-5 py-4 sm:flex-row ${
        divided ? "border-t border-line" : ""
      }`}
    >
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="input flex-1"
        aria-label="Project name"
        autoFocus
      />
      <input
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Client / description"
        className="input flex-1"
        aria-label="Client or description"
      />
      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="btn btn-ghost">
          Cancel
        </button>
        <button type="submit" disabled={!name.trim()} className="btn btn-primary">
          Save
        </button>
      </div>
    </form>
  );
}
