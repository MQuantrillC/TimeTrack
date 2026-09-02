"use client";

import { useSyncExternalStore } from "react";
import { newId } from "./id";
import type { Project, TimeSession, TrackerData } from "./types";

const STORAGE_KEY = "timetrack.v1";

const EMPTY: TrackerData = {
  projects: [],
  sessions: [],
  selectedProjectId: null,
  currentSessionId: null,
  runningSince: null,
};

export type TrackerState = TrackerData & { ready: boolean };

let state: TrackerState = { ...EMPTY, ready: false };
let hydrated = false;
const listeners = new Set<() => void>();

function persist(data: TrackerData) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage unavailable (private mode, quota) — the app still works in memory
  }
}

/** Notified after every change the user made on this device, so it can be synced. */
let onLocalChange: ((data: TrackerData) => void) | null = null;

export function setLocalChangeHandler(handler: ((data: TrackerData) => void) | null) {
  onLocalChange = handler;
}

function commit(data: TrackerData) {
  state = { ...data, ready: true };
  persist(data);
  listeners.forEach((listener) => listener());
  onLocalChange?.(data);
}

/** Adopt state that came from the server. Does not echo back as a local change. */
export function applyRemoteState(data: TrackerData) {
  hydrated = true;
  state = { ...data, ready: true };
  persist(data);
  listeners.forEach((listener) => listener());
}

/** Replace what is on this device, e.g. when clearing it on sign out. */
export const replaceState = applyRemoteState;

/** The current state, for the sync engine to push. */
export function snapshot(): TrackerData {
  return {
    projects: state.projects,
    sessions: state.sessions,
    selectedProjectId: state.selectedProjectId,
    currentSessionId: state.currentSessionId,
    runningSince: state.runningSince,
  };
}

function read(): TrackerData | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TrackerData>;
    if (!Array.isArray(parsed.projects) || !Array.isArray(parsed.sessions)) return null;
    return {
      projects: parsed.projects,
      sessions: parsed.sessions,
      selectedProjectId: parsed.selectedProjectId ?? null,
      currentSessionId: parsed.currentSessionId ?? null,
      runningSince: parsed.runningSince ?? null,
    };
  } catch {
    return null;
  }
}

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  state = { ...(read() ?? EMPTY), ready: true };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const SERVER_STATE: TrackerState = { ...EMPTY, ready: false };

export function useTracker(): TrackerState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}

/* ---------------------------------------------------------------- selectors */

export function findProject(data: TrackerData, id: string | null): Project | null {
  return data.projects.find((project) => project.id === id) ?? null;
}

function currentSession(data: TrackerData): TimeSession | null {
  return data.sessions.find((session) => session.id === data.currentSessionId) ?? null;
}

export function isRunning(data: TrackerData): boolean {
  return data.runningSince !== null;
}

/** Milliseconds of the segment that is ticking right now (0 when paused). */
function liveElapsed(data: TrackerData, now: number): number {
  return data.runningSince === null ? 0 : Math.max(0, now - data.runningSince);
}

/** Elapsed time of the session in progress, including the live segment. */
export function currentSessionElapsed(data: TrackerData, now: number): number {
  const session = currentSession(data);
  if (!session) return 0;
  return session.duration + liveElapsed(data, now);
}

/** Sum of every session on the project, including the live segment. */
export function projectTotal(data: TrackerData, projectId: string, now: number): number {
  let total = 0;
  for (const session of data.sessions) {
    if (session.projectId === projectId) total += session.duration;
  }
  const running = currentSession(data);
  if (running && running.projectId === projectId) total += liveElapsed(data, now);
  return total;
}

/**
 * Everything tracked since `from`, attributing a session to the day it began.
 * Pass a projectId to narrow it to one project.
 */
export function totalSince(
  data: TrackerData,
  from: number,
  now: number,
  projectId?: string,
): number {
  let total = 0;
  for (const session of data.sessions) {
    if (session.startedAt < from) continue;
    if (projectId && session.projectId !== projectId) continue;
    total += session.duration;
  }
  const current = data.sessions.find((session) => session.id === data.currentSessionId);
  if (
    current &&
    current.startedAt >= from &&
    (!projectId || current.projectId === projectId)
  ) {
    total += liveElapsed(data, now);
  }
  return total;
}

export type HistoryEntry = {
  id: string;
  projectId: string;
  projectName: string;
  startedAt: number;
  endedAt: number | null;
  /** worked time, including the live segment when this entry is running */
  duration: number;
  running: boolean;
};

/**
 * Every stretch of work, newest first. One entry per session: it opens when the
 * project is first started and closes when the user moves on, so switching
 * projects always begins a new line in the log.
 */
export function sessionHistory(data: TrackerData, now: number): HistoryEntry[] {
  const names = new Map(data.projects.map((project) => [project.id, project.name]));
  return data.sessions
    .map((session) => {
      const running = session.id === data.currentSessionId && data.runningSince !== null;
      return {
        id: session.id,
        projectId: session.projectId,
        projectName: names.get(session.projectId) ?? "Deleted project",
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        duration: session.duration + (running ? liveElapsed(data, now) : 0),
        running,
      };
    })
    .sort((a, b) => b.startedAt - a.startedAt);
}

/* ------------------------------------------------------------------ actions */

/** Closes the live segment into its session. Returns data unchanged when paused. */
function pauseData(data: TrackerData, now: number): TrackerData {
  if (data.runningSince === null) return data;
  const elapsed = Math.max(0, now - data.runningSince);
  return {
    ...data,
    sessions: data.sessions.map((session) =>
      session.id === data.currentSessionId
        ? { ...session, duration: session.duration + elapsed, endedAt: now }
        : session,
    ),
    runningSince: null,
  };
}

export function pause() {
  if (state.runningSince === null) return;
  commit(pauseData(state, Date.now()));
}

/**
 * Coming back within this window continues the same session; a longer gap opens
 * a new one. A short interruption — a call, a coffee — belongs to the stretch of
 * work around it. Returning hours later does not, and treating it as the same
 * session produced history rows spanning days that held seconds of work.
 *
 * NEW SESSION still splits deliberately inside the window.
 */
const RESUME_WINDOW_MS = 5 * 60_000;

function resumable(session: TimeSession, now: number): boolean {
  // a session with no end was never closed, so there is nothing to resume across
  if (session.endedAt === null) return true;
  return now - session.endedAt <= RESUME_WINDOW_MS;
}

export function start() {
  const now = Date.now();
  const data = state;
  if (!data.selectedProjectId || data.runningSince !== null) return;

  const session = currentSession(data);
  if (session && session.projectId === data.selectedProjectId && resumable(session, now)) {
    // resume the paused session — it keeps counting from where it left off
    commit({
      ...data,
      sessions: data.sessions.map((item) =>
        item.id === session.id ? { ...item, endedAt: null } : item,
      ),
      runningSince: now,
    });
    return;
  }

  const fresh: TimeSession = {
    id: newId(),
    projectId: data.selectedProjectId,
    startedAt: now,
    endedAt: null,
    duration: 0,
  };
  commit({
    ...data,
    sessions: [...data.sessions, fresh],
    currentSessionId: fresh.id,
    runningSince: now,
  });
}

/**
 * Closes the current session and begins a fresh one. Past sessions are kept.
 * If the timer was running it keeps running, on the new session.
 */
export function newSession() {
  const now = Date.now();
  const wasRunning = state.runningSince !== null;
  const paused = pauseData(state, now);
  commit({ ...paused, currentSessionId: null });
  if (wasRunning) start();
}

/** Switching projects always pauses first, and never auto-starts the new one. */
export function selectProject(projectId: string | null) {
  const data = state;
  if (data.selectedProjectId === projectId) return;
  const paused = pauseData(data, Date.now());
  commit({ ...paused, selectedProjectId: projectId, currentSessionId: null });
}

export function createProject(name: string, description: string): Project {
  const now = Date.now();
  const project: Project = {
    id: newId(),
    name: name.trim(),
    description: description.trim(),
    createdAt: now,
  };
  const paused = pauseData(state, now);
  commit({
    ...paused,
    projects: [...paused.projects, project],
    selectedProjectId: project.id,
    currentSessionId: null,
  });
  return project;
}

/* ----------------------------------------------------------------- sessions */

/**
 * Record work that was never timed — or fix a session after the fact.
 * A hand-edited session is taken at face value: the user is saying "I worked
 * from here to here", so its duration becomes exactly that span.
 */
export function addSession(projectId: string, startedAt: number, endedAt: number) {
  if (!projectId || endedAt <= startedAt) return;
  const session: TimeSession = {
    id: newId(),
    projectId,
    startedAt,
    endedAt,
    duration: endedAt - startedAt,
  };
  commit({ ...state, sessions: [...state.sessions, session] });
}

export function updateSession(id: string, startedAt: number, endedAt: number) {
  if (endedAt <= startedAt) return;
  // the running session is defined by the clock, not by the stored times
  if (id === state.currentSessionId && state.runningSince !== null) return;
  commit({
    ...state,
    sessions: state.sessions.map((session) =>
      session.id === id
        ? { ...session, startedAt, endedAt, duration: endedAt - startedAt }
        : session,
    ),
  });
}

export function deleteSession(id: string) {
  // if it is the one on the clock, stop first so nothing keeps counting
  const data = id === state.currentSessionId ? pauseData(state, Date.now()) : state;
  commit({
    ...data,
    sessions: data.sessions.filter((session) => session.id !== id),
    currentSessionId: data.currentSessionId === id ? null : data.currentSessionId,
  });
}

export function updateProject(id: string, name: string, description: string) {
  commit({
    ...state,
    projects: state.projects.map((project) =>
      project.id === id
        ? { ...project, name: name.trim(), description: description.trim() }
        : project,
    ),
  });
}

export function deleteProject(id: string) {
  const data = pauseData(state, Date.now());
  const projects = data.projects.filter((project) => project.id !== id);
  const wasSelected = data.selectedProjectId === id;
  const lostSession = data.sessions.some(
    (session) => session.id === data.currentSessionId && session.projectId === id,
  );
  commit({
    ...data,
    projects,
    sessions: data.sessions.filter((session) => session.projectId !== id),
    selectedProjectId: wasSelected ? (projects[0]?.id ?? null) : data.selectedProjectId,
    currentSessionId: wasSelected || lostSession ? null : data.currentSessionId,
  });
}
