"use client";

import { useSyncExternalStore } from "react";

/**
 * How the history log is arranged: "project" gathers the sessions under the
 * project they belong to and ranks them by time spent, "session" lists every
 * one of them in the order they happened.
 */
export type HistoryView = "project" | "session";

const STORAGE_KEY = "timetrack.historyView";

let view: HistoryView = "project";
let hydrated = false;
const listeners = new Set<() => void>();

/**
 * Read on first subscribe rather than at import, so the server and the first
 * client render agree on the default and only then settle on the preference.
 */
function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "project" || stored === "session") view = stored;
  } catch {
    // storage unavailable — the default stands
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setHistoryView(next: HistoryView) {
  if (next === view) return;
  view = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // the choice simply will not outlive the tab
  }
  listeners.forEach((listener) => listener());
}

export function useHistoryView(): HistoryView {
  return useSyncExternalStore(
    subscribe,
    () => view,
    () => "project",
  );
}
