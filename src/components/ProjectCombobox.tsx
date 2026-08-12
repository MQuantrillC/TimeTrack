"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, SearchIcon } from "@/components/icons";
import type { Project } from "@/lib/types";

type Option = { id: string | null; name: string; description: string };

type Props = {
  projects: Project[];
  /** null means the "all" entry when `includeAll` is set, otherwise nothing chosen. */
  selectedId: string | null;
  onSelect: (projectId: string | null) => void;
  /** Adds an entry covering every project; choosing it reports null. */
  includeAll?: boolean;
  allLabel?: string;
  label?: string;
  className?: string;
};

/**
 * Type-to-search project picker. Closed it reads as the current choice;
 * focused it becomes a search field over every project in memory.
 */
export function ProjectCombobox({
  projects,
  selectedId,
  onSelect,
  includeAll = false,
  allLabel = "All projects",
  label = "Current project",
  className = "flex-1",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = useMemo<Option[]>(() => {
    const items = projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
    }));
    return includeAll ? [{ id: null, name: allLabel, description: "" }, ...items] : items;
  }, [projects, includeAll, allLabel]);

  const selected = options.find((option) => option.id === selectedId) ?? null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.name.toLowerCase().includes(q) || option.description.toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // keep the highlighted option in view when arrowing through a long list
  useEffect(() => {
    listRef.current?.children[highlight]?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  const openList = () => {
    if (open) return;
    setQuery("");
    setHighlight(Math.max(0, options.findIndex((option) => option.id === selectedId)));
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const choose = (option: Option) => {
    onSelect(option.id);
    close();
    inputRef.current?.blur();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) return openList();
      setHighlight((current) => Math.min(current + 1, matches.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) return openList();
      setHighlight((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      if (open && matches[highlight]) {
        event.preventDefault();
        choose(matches[highlight]);
      }
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        close();
      }
    } else if (event.key === "Tab") {
      close();
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="project-listbox"
        aria-autocomplete="list"
        aria-activedescendant={
          open && matches[highlight] ? `project-option-${highlight}` : undefined
        }
        aria-label={label}
        autoComplete="off"
        spellCheck={false}
        value={open ? query : (selected?.name ?? "")}
        placeholder={
          open ? "Search projects…" : projects.length ? "Select a project" : "No projects yet"
        }
        onChange={(event) => {
          if (!open) setOpen(true);
          setQuery(event.target.value);
          setHighlight(0);
        }}
        onFocus={openList}
        onClick={openList}
        onKeyDown={onKeyDown}
        className="select pl-10"
      />

      <SearchIcon
        className={`pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 transition-colors ${
          open ? "text-olive" : "text-ink-subtle"
        }`}
      />

      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => (open ? close() : inputRef.current?.focus())}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-ink-subtle transition-colors hover:text-ink"
      >
        <ChevronDownIcon className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          id="project-listbox"
          ref={listRef}
          role="listbox"
          className="absolute top-full right-0 left-0 z-20 mt-1.5 max-h-64 min-w-56 overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-[0_12px_28px_-10px_rgb(35_38_27/0.25)]"
        >
          {matches.length === 0 && (
            <li className="px-3.5 py-3 text-sm text-ink-muted">
              No project matches “{query.trim()}”
            </li>
          )}
          {matches.map((option, index) => {
            const isSelected = option.id === selectedId;
            return (
              <li
                key={option.id ?? "__all__"}
                id={`project-option-${index}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlight(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
                className={`cursor-pointer px-3.5 py-2 ${
                  index === highlight ? "bg-olive-tint" : ""
                } ${option.id === null ? "border-b border-line" : ""}`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`truncate text-sm text-ink ${
                      isSelected ? "font-semibold" : "font-medium"
                    } ${option.id === null ? "text-ink-muted" : ""}`}
                  >
                    {option.name}
                  </span>
                  {isSelected && <span className="size-1.5 shrink-0 rounded-full bg-olive" />}
                </span>
                {option.description && (
                  <span className="mt-0.5 block truncate text-xs text-ink-muted">
                    {option.description}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
