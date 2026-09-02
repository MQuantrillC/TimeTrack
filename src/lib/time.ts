/** 02:34:17 — hours are not wrapped at 24 */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/** 18h 42m 31s */
export function formatHms(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${m}m ${s}s`;
}

/** 18h 42m — compact form used in lists and tables */
export function formatHm(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 12:41 PM */
export function formatTimeOfDay(ts: number): string {
  const date = new Date(ts);
  const hours = date.getHours();
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${pad(hours % 12 || 12)}:${pad(date.getMinutes())} ${suffix}`;
}

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * When a session ended. Carries the date whenever that is a different day from
 * the start — without it, a session running past midnight reads as having
 * finished before it began.
 */
export function formatSessionEnd(startedAt: number, endedAt: number): string {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  if (start.toDateString() === end.toDateString()) return formatTimeOfDay(endedAt);
  return `${MONTH_ABBR[end.getMonth()]} ${end.getDate()}, ${formatTimeOfDay(endedAt)}`;
}

/**
 * Whether the clock was stopped for a meaningful stretch inside a session, which
 * is why its span can be far longer than the time it records.
 */
export function hadPause(
  startedAt: number,
  endedAt: number | null,
  duration: number,
): boolean {
  return endedAt !== null && endedAt - startedAt - duration > 60_000;
}

/** 08/10/2026 12:41 PM */
export function formatDateTime(ts: number): string {
  const date = new Date(ts);
  const day = `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`;
  return `${day} ${formatTimeOfDay(ts)}`;
}

export function startOfDay(now: number): number {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Weeks start on Monday. */
export function startOfWeek(now: number): number {
  const date = new Date(startOfDay(now));
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date.getTime();
}

export function startOfMonth(now: number): number {
  const date = new Date(startOfDay(now));
  date.setDate(1);
  return date.getTime();
}

export function startOfQuarter(now: number): number {
  const date = new Date(startOfMonth(now));
  date.setMonth(Math.floor(date.getMonth() / 3) * 3);
  return date.getTime();
}

export function startOfHalf(now: number): number {
  const date = new Date(startOfMonth(now));
  date.setMonth(date.getMonth() < 6 ? 0 : 6);
  return date.getTime();
}

export function startOfYear(now: number): number {
  const date = new Date(startOfDay(now));
  date.setMonth(0, 1);
  return date.getTime();
}

/** Epoch to the value an <input type="datetime-local"> expects, in local time. */
export function toDateTimeInput(ts: number): string {
  const date = new Date(ts);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** Back again. Returns null if the field is empty or unparseable. */
export function fromDateTimeInput(value: string): number | null {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? null : ts;
}

/** 10:54 minutes · 2:32:15 hours · 42 seconds */
export function formatDurationLabel(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(s)} hours`;
  if (m > 0) return `${m}:${pad(s)} minutes`;
  return `${s} ${s === 1 ? "second" : "seconds"}`;
}
