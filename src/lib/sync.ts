"use client";

import { useSyncExternalStore } from "react";
import { CODE_PATTERN, newSyncCode, normalizeSyncCode } from "./id";
import { applyRemoteState, setLocalChangeHandler, snapshot } from "./store";
import type { TrackerData } from "./types";

/**
 * Cloud sync.
 *
 * The app stays offline-first: every change is written to localStorage exactly
 * as before, and syncing is a layer on top that pushes the state document up
 * and pulls it back down. A sync code is the only identifier — no accounts.
 *
 * Conflict rule: the device the user is actively touching wins. We pull on
 * load and whenever the tab regains focus, so an active device is almost
 * always current before it writes; if a push is rejected as stale we pull,
 * then overwrite with the local state rather than silently discarding the
 * change the user just made.
 */

const STORAGE_KEY = "timetrack.sync.v1";
const PUSH_DEBOUNCE_MS = 900;

export type SyncStatus = "off" | "connecting" | "syncing" | "synced" | "error";

export type SyncState = {
  ready: boolean;
  code: string | null;
  status: SyncStatus;
  message: string | null;
  lastSyncedAt: number | null;
};

let state: SyncState = {
  ready: false,
  code: null,
  status: "off",
  message: null,
  lastSyncedAt: null,
};

let version = 0;
let started = false;
let pushing = false;
let pushQueued = false;
let pulling = false;
let pushTimer: number | null = null;

const listeners = new Set<() => void>();

function set(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function persistCode() {
  try {
    if (state.code) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ code: state.code, version }));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // storage unavailable — sync still works for this session
  }
}

function readCode(): { code: string; version: number } | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { code?: unknown; version?: unknown };
    if (typeof parsed.code !== "string" || !CODE_PATTERN.test(parsed.code)) return null;
    return { code: parsed.code, version: Number(parsed.version) || 0 };
  } catch {
    return null;
  }
}

function isTrackerData(value: unknown): value is TrackerData {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Partial<TrackerData>;
  return Array.isArray(data.projects) && Array.isArray(data.sessions);
}

async function readError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : fallback;
}

/* -------------------------------------------------------------------- push */

async function pushNow() {
  if (!state.code || pushing) {
    pushQueued = pushQueued || Boolean(state.code);
    return;
  }
  pushing = true;
  set({ status: "syncing", message: null });

  const code = state.code;
  const data = snapshot();

  try {
    let response = await fetch("/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, state: data, baseVersion: version }),
    });

    if (response.status === 409) {
      // another device wrote first — keep what the user just did on this device
      const conflict = await response.json().catch(() => null);
      response = await fetch("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code,
          state: data,
          baseVersion: Number(conflict?.version) || version,
          force: true,
        }),
      });
    } else if (response.status === 404) {
      // the workspace disappeared — re-create it under the same code
      response = await fetch("/api/sync", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, state: data }),
      });
    }

    if (!response.ok) {
      set({ status: "error", message: await readError(response, "Could not sync.") });
      return;
    }

    const body = await response.json();
    version = Number(body.version) || version + 1;
    persistCode();
    set({ status: "synced", message: null, lastSyncedAt: Date.now() });
  } catch {
    set({ status: "error", message: "Offline — changes are saved on this device." });
  } finally {
    pushing = false;
    if (pushQueued) {
      pushQueued = false;
      void pushNow();
    }
  }
}

function schedulePush() {
  if (!state.code) return;
  if (pushTimer !== null) window.clearTimeout(pushTimer);
  set({ status: "syncing" });
  pushTimer = window.setTimeout(() => {
    pushTimer = null;
    void pushNow();
  }, PUSH_DEBOUNCE_MS);
}

function flushPush() {
  if (pushTimer === null || !state.code) return;
  window.clearTimeout(pushTimer);
  pushTimer = null;
  void pushNow();
}

/* -------------------------------------------------------------------- pull */

export async function pullNow() {
  if (!state.code || pulling) return;
  pulling = true;
  try {
    const response = await fetch(`/api/sync?code=${state.code}`, { cache: "no-store" });
    if (!response.ok) {
      if (response.status === 404) {
        // nothing stored yet under this code — publish what we have
        void pushNow();
        return;
      }
      set({ status: "error", message: await readError(response, "Could not sync.") });
      return;
    }
    const body = await response.json();
    const remoteVersion = Number(body.version) || 0;
    if (isTrackerData(body.state) && remoteVersion !== version) {
      version = remoteVersion;
      applyRemoteState(body.state);
      persistCode();
    }
    set({ status: "synced", message: null, lastSyncedAt: Date.now() });
  } catch {
    set({ status: "error", message: "Offline — changes are saved on this device." });
  } finally {
    pulling = false;
  }
}

/* ------------------------------------------------------------------ actions */

/** Start syncing this device's data under a brand new code. */
export async function enableSync(): Promise<void> {
  const code = newSyncCode();
  set({ code, status: "connecting", message: null });
  version = 0;

  try {
    const response = await fetch("/api/sync", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, state: snapshot() }),
    });
    if (!response.ok) {
      set({ code: null, status: "off", message: await readError(response, "Could not sync.") });
      return;
    }
    const body = await response.json();
    version = Number(body.version) || 1;
    persistCode();
    set({ status: "synced", message: null, lastSyncedAt: Date.now() });
  } catch {
    set({ code: null, status: "off", message: "Could not reach the server." });
  }
}

/** Adopt the data stored under an existing code, replacing what is on this device. */
export async function connectWithCode(input: string): Promise<boolean> {
  const code = normalizeSyncCode(input);
  if (!CODE_PATTERN.test(code)) {
    set({ message: "That doesn't look like a sync code." });
    return false;
  }

  set({ status: "connecting", message: null });
  try {
    const response = await fetch(`/api/sync?code=${code}`, { cache: "no-store" });
    if (!response.ok) {
      set({
        status: state.code ? "synced" : "off",
        message: await readError(response, "Could not sync."),
      });
      return false;
    }
    const body = await response.json();
    if (!isTrackerData(body.state)) {
      set({ status: state.code ? "synced" : "off", message: "That data could not be read." });
      return false;
    }
    version = Number(body.version) || 0;
    applyRemoteState(body.state);
    set({ code, status: "synced", message: null, lastSyncedAt: Date.now() });
    persistCode();
    return true;
  } catch {
    set({ status: state.code ? "synced" : "off", message: "Could not reach the server." });
    return false;
  }
}

/** Stop syncing. The data stays on this device and stays in the cloud. */
export function disconnect() {
  if (pushTimer !== null) {
    window.clearTimeout(pushTimer);
    pushTimer = null;
  }
  version = 0;
  set({ code: null, status: "off", message: null, lastSyncedAt: null });
  persistCode();
}

export function syncNow() {
  if (!state.code) return;
  flushPush();
  void pullNow();
}

/* ------------------------------------------------------------------- wiring */

function start() {
  if (started) return;
  started = true;

  setLocalChangeHandler(schedulePush);

  const stored = readCode();
  if (stored) {
    version = stored.version;
    set({ ready: true, code: stored.code, status: "syncing" });
    void pullNow();
  } else {
    set({ ready: true });
  }

  const onVisible = () => {
    if (document.visibilityState === "visible") void pullNow();
    else flushPush();
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", () => void pullNow());
  window.addEventListener("pagehide", flushPush);
  window.addEventListener("online", () => void pullNow());
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const SERVER_STATE: SyncState = {
  ready: false,
  code: null,
  status: "off",
  message: null,
  lastSyncedAt: null,
};

export function useSync(): SyncState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}
