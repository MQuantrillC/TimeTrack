"use client";

import { useSyncExternalStore } from "react";
import { applyRemoteState, replaceState, setLocalChangeHandler, snapshot } from "./store";
import type { TrackerData } from "./types";

/**
 * Account session and cloud sync.
 *
 * The app stays offline-first: every change is written to localStorage exactly
 * as before, and syncing is a layer on top that pushes the state document up
 * and pulls it back down for whoever is signed in.
 *
 * Conflict rule: the device the user is actively touching wins. We pull on
 * load and whenever the tab regains focus, so an active device is almost
 * always current before it writes; if a push is rejected as stale we push
 * again rather than silently discarding the change the user just made.
 */

const PUSH_DEBOUNCE_MS = 900;

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type SyncStatus = "off" | "syncing" | "synced" | "error";

export type AccountState = {
  ready: boolean;
  user: User | null;
  /** false when the deployment has no database, so the UI can explain itself */
  accountsAvailable: boolean;
  status: SyncStatus;
  message: string | null;
  /** decided on the server, per account — see lib/flair.ts */
  hearts: boolean;
  /** decided on the server — see lib/admin.ts. Shows the button; grants nothing. */
  admin: boolean;
};

let state: AccountState = {
  ready: false,
  user: null,
  accountsAvailable: true,
  status: "off",
  message: null,
  hearts: false,
  admin: false,
};

let version = 0;
let started = false;
let pushing = false;
let pushQueued = false;
let pulling = false;
let pushTimer: number | null = null;

const listeners = new Set<() => void>();

function set(patch: Partial<AccountState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function isTrackerData(value: unknown): value is TrackerData {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Partial<TrackerData>;
  return Array.isArray(data.projects) && Array.isArray(data.sessions);
}

async function errorFrom(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : fallback;
}

/* -------------------------------------------------------------------- push */

async function pushNow() {
  if (!state.user) return;
  if (pushing) {
    pushQueued = true;
    return;
  }
  pushing = true;
  set({ status: "syncing", message: null });

  const data = snapshot();
  try {
    let response = await fetch("/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state: data, baseVersion: version }),
    });

    if (response.status === 409) {
      // another device wrote first — keep what the user just did on this device
      const conflict = await response.json().catch(() => null);
      version = Number(conflict?.version) || version;
      response = await fetch("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state: data, baseVersion: version, force: true }),
      });
    }

    if (response.status === 401) {
      signedOutLocally();
      return;
    }
    if (!response.ok) {
      set({ status: "error", message: await errorFrom(response, "Could not sync.") });
      return;
    }

    const body = await response.json();
    version = Number(body.version) || version + 1;
    set({ status: "synced", message: null });
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
  if (!state.user) return;
  if (pushTimer !== null) window.clearTimeout(pushTimer);
  set({ status: "syncing" });
  pushTimer = window.setTimeout(() => {
    pushTimer = null;
    void pushNow();
  }, PUSH_DEBOUNCE_MS);
}

function flushPush() {
  if (pushTimer === null || !state.user) return;
  window.clearTimeout(pushTimer);
  pushTimer = null;
  void pushNow();
}

/* -------------------------------------------------------------------- pull */

export async function pullNow() {
  if (!state.user || pulling) return;
  pulling = true;
  try {
    const response = await fetch("/api/sync", { cache: "no-store" });
    if (response.status === 404) {
      // first sync for this account — publish what is on this device
      void pushNow();
      return;
    }
    if (response.status === 401) {
      signedOutLocally();
      return;
    }
    if (!response.ok) {
      set({ status: "error", message: await errorFrom(response, "Could not sync.") });
      return;
    }
    const body = await response.json();
    const remoteVersion = Number(body.version) || 0;
    if (isTrackerData(body.state) && remoteVersion !== version) {
      version = remoteVersion;
      applyRemoteState(body.state);
    }
    set({ status: "synced", message: null });
  } catch {
    set({ status: "error", message: "Offline — changes are saved on this device." });
  } finally {
    pulling = false;
  }
}

/* ----------------------------------------------------------------- sessions */

function signedOutLocally() {
  version = 0;
  if (pushTimer !== null) {
    window.clearTimeout(pushTimer);
    pushTimer = null;
  }
  set({ user: null, status: "off", message: null, hearts: false, admin: false });
}

async function afterSignIn(user: User, hearts: boolean, admin: boolean) {
  version = 0;
  set({ user, hearts, admin, status: "syncing", message: null });
  await pullNow();
}

export async function signUp(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}): Promise<string | null> {
  try {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) return await errorFrom(response, "Could not create the account.");
    const body = await response.json();
    // a brand new account has no stored state, so this device's data becomes its data
    await afterSignIn(body.user as User, body.hearts === true, body.admin === true);
    return null;
  } catch {
    return "Could not reach the server.";
  }
}

export async function signIn(email: string, password: string): Promise<string | null> {
  try {
    const response = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) return await errorFrom(response, "Could not sign in.");
    const body = await response.json();
    await afterSignIn(body.user as User, body.hearts === true, body.admin === true);
    return null;
  } catch {
    return "Could not reach the server.";
  }
}

/** Signing out clears this device — the data is safe in the account. */
export async function signOut(): Promise<void> {
  flushPush();
  try {
    await fetch("/api/auth/session", { method: "DELETE" });
  } catch {
    // clearing locally is still the right outcome
  }
  signedOutLocally();
  replaceState({
    projects: [],
    sessions: [],
    selectedProjectId: null,
    currentSessionId: null,
    runningSince: null,
  });
}

export function syncNow() {
  if (!state.user) return;
  flushPush();
  void pullNow();
}

/* ------------------------------------------------------------------- wiring */

function start() {
  if (started) return;
  started = true;

  setLocalChangeHandler(schedulePush);

  void (async () => {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const body = await response.json();
      set({
        ready: true,
        user: body.user ?? null,
        accountsAvailable: body.accountsAvailable !== false,
        hearts: body.hearts === true,
        admin: body.admin === true,
      });
      if (body.user) {
        set({ status: "syncing" });
        await pullNow();
      }
    } catch {
      set({ ready: true });
    }
  })();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void pullNow();
    else flushPush();
  });
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

const SERVER_STATE: AccountState = {
  ready: false,
  user: null,
  accountsAvailable: true,
  status: "off",
  message: null,
  hearts: false,
  admin: false,
};

export function useAccount(): AccountState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}
