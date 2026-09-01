import {
  startOfDay,
  startOfHalf,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "./time";

/**
 * The window the history page is showing.
 *
 * Each period is anchored on the one containing `now` and steps backwards from
 * there, so "Month" opens on this month and the arrows walk to August, July and
 * so on. `offset` is 0 for the current period and negative going back; forward
 * beyond 0 is not offered, since there is nothing there to look at.
 */

export type PeriodKey = "all" | "day" | "week" | "month" | "quarter" | "half" | "year";

/** The quick presets on the filter row. */
export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "half", label: "Half" },
  { key: "year", label: "Year" },
];

/** The granularities the picker can browse. "all" is offered separately. */
export const GRANULARITIES: { key: Exclude<PeriodKey, "all">; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "half", label: "Half-year" },
  { key: "year", label: "Year" },
];

export type PeriodRange = {
  /** Inclusive lower bound; null means no lower bound. */
  start: number | null;
  /** Exclusive upper bound; null means open-ended. */
  end: number | null;
  /** What to show beside the page title; null when nothing is worth naming. */
  label: string | null;
  /** Whether this period can be stepped through at all. */
  navigable: boolean;
};

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function ordinal(n: number): string {
  const teens = n % 100;
  if (teens >= 11 && teens <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** The year is only worth stating when it is not the one we are in. */
function yearSuffix(date: Date, now: number): string {
  return date.getFullYear() === new Date(now).getFullYear() ? "" : ` ${date.getFullYear()}`;
}

/** Tuesday, September 1st */
export function formatDayLabel(ts: number, now: number): string {
  const date = new Date(ts);
  const base = `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${ordinal(date.getDate())}`;
  return date.getFullYear() === new Date(now).getFullYear()
    ? base
    : `${base}, ${date.getFullYear()}`;
}

/** September 1–7 · August 31 – September 6 */
function formatWeekLabel(startTs: number, endTs: number, now: number): string {
  const from = new Date(startTs);
  const to = new Date(endTs - 1); // endTs is exclusive, so step back into the last day
  const span =
    from.getMonth() === to.getMonth()
      ? `${MONTHS[from.getMonth()]} ${from.getDate()}–${to.getDate()}`
      : `${MONTHS[from.getMonth()]} ${from.getDate()} – ${MONTHS[to.getMonth()]} ${to.getDate()}`;
  return span + yearSuffix(to, now);
}

export function periodRange(key: PeriodKey, offset: number, now: number): PeriodRange {
  if (key === "all") {
    return { start: null, end: null, label: null, navigable: false };
  }

  if (key === "day") {
    const start = new Date(startOfDay(now));
    start.setDate(start.getDate() + offset);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return {
      start: start.getTime(),
      end: end.getTime(),
      label: formatDayLabel(start.getTime(), now),
      navigable: true,
    };
  }

  if (key === "week") {
    const start = new Date(startOfWeek(now));
    start.setDate(start.getDate() + offset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return {
      start: start.getTime(),
      end: end.getTime(),
      label: formatWeekLabel(start.getTime(), end.getTime(), now),
      navigable: true,
    };
  }

  if (key === "month") {
    const start = new Date(startOfMonth(now));
    start.setMonth(start.getMonth() + offset);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    return {
      start: start.getTime(),
      end: end.getTime(),
      label: MONTHS[start.getMonth()] + yearSuffix(start, now),
      navigable: true,
    };
  }

  if (key === "quarter") {
    const start = new Date(startOfQuarter(now));
    start.setMonth(start.getMonth() + offset * 3);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 3);
    return {
      start: start.getTime(),
      end: end.getTime(),
      label: `Q${Math.floor(start.getMonth() / 3) + 1}${yearSuffix(start, now)}`,
      navigable: true,
    };
  }

  if (key === "half") {
    const start = new Date(startOfHalf(now));
    start.setMonth(start.getMonth() + offset * 6);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 6);
    return {
      start: start.getTime(),
      end: end.getTime(),
      label: `H${Math.floor(start.getMonth() / 6) + 1}${yearSuffix(start, now)}`,
      navigable: true,
    };
  }

  // year: the current one runs to now rather than to 31 December
  const start = new Date(startOfYear(now));
  start.setFullYear(start.getFullYear() + offset);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  return {
    start: start.getTime(),
    end: offset === 0 ? null : end.getTime(),
    label: offset === 0 ? `${start.getFullYear()} to date` : `${start.getFullYear()}`,
    navigable: true,
  };
}

/** Whole days since the epoch, ignoring clocks — safe across DST. */
function dayIndex(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

/**
 * How many periods separate the one containing `target` from the one containing
 * `now` — the offset that would bring `target` into view.
 */
export function offsetFor(key: Exclude<PeriodKey, "all">, target: Date, now: number): number {
  const here = new Date(now);
  switch (key) {
    case "day":
      return dayIndex(target) - dayIndex(here);
    case "week":
      return Math.round(
        (dayIndex(new Date(startOfWeek(target.getTime()))) -
          dayIndex(new Date(startOfWeek(now)))) /
          7,
      );
    case "month":
      return (
        (target.getFullYear() - here.getFullYear()) * 12 + (target.getMonth() - here.getMonth())
      );
    case "quarter":
      return (
        (target.getFullYear() - here.getFullYear()) * 4 +
        (Math.floor(target.getMonth() / 3) - Math.floor(here.getMonth() / 3))
      );
    case "half":
      return (
        (target.getFullYear() - here.getFullYear()) * 2 +
        (Math.floor(target.getMonth() / 6) - Math.floor(here.getMonth() / 6))
      );
    case "year":
      return target.getFullYear() - here.getFullYear();
  }
}
