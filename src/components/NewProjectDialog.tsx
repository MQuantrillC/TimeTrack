"use client";

import { useEffect, useState } from "react";
import { createProject } from "@/lib/store";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function NewProjectDialog({ open, onClose }: Props) {
  // mounted only while open, so the form always starts empty
  return open ? <Dialog onClose={onClose} /> : null;
}

function Dialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    createProject(name, description);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/25 p-6 pt-24 sm:pt-32">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New project"
        className="relative w-full max-w-md rounded-xl border border-line bg-surface p-7 shadow-[0_16px_40px_-12px_rgb(35_38_27/0.22)]"
      >
        <h2 className="text-base font-semibold tracking-tight text-ink">New project</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Created projects are selected, never started automatically.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Project name">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Smith v. Johnson"
              className="input"
              autoFocus
            />
          </Field>
          <Field label="Client / description" optional>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Smith Holdings Ltd."
              className="input"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={!name.trim()} className="btn btn-primary">
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold tracking-[0.12em] text-ink-muted uppercase">
        {label}
        {optional && (
          <span className="ml-1.5 font-normal tracking-normal text-ink-subtle normal-case">
            optional
          </span>
        )}
      </span>
      {children}
    </label>
  );
}
