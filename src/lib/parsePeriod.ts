import { MONTHS, offsetFor, type PeriodKey } from "./period";

/**
 * Turns what someone types into a period.
 *
 * Handles the shapes people actually reach for — "July 1", "q3 2024", "August",
 * "last week", "2025" — and gives up quietly on anything else rather than
 * guessing. Month names match on their first three letters, which are unique
 * across all twelve, so "jul", "July" and a mistyped "Jule" all land on July.
 */

export type ParsedPeriod = { key: PeriodKey; offset: number };

function monthFromWord(word: string): number {
  if (word.length < 3) return -1;
  const stem = word.slice(0, 3).toLowerCase();
  return MONTHS.findIndex((month) => month.slice(0, 3).toLowerCase() === stem);
}

/** Two-digit years are read as this century. */
function fullYear(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const value = Number(raw);
  if (raw.length <= 2) return 2000 + value;
  return value;
}

export function parsePeriod(input: string, now: number): ParsedPeriod | null {
  const text = input.trim().toLowerCase().replace(/\s+/g, " ").replace(/,/g, "");
  if (!text) return null;

  const here = new Date(now);
  const thisYear = here.getFullYear();
  const day = (target: Date) => ({ key: "day" as const, offset: offsetFor("day", target, now) });

  /* ------------------------------------------------------------ relative */

  if (text === "all" || text === "all time" || text === "everything") {
    return { key: "all", offset: 0 };
  }
  if (text === "today") return { key: "day", offset: 0 };
  if (text === "yesterday") return { key: "day", offset: -1 };
  if (text === "this week") return { key: "week", offset: 0 };
  if (text === "last week") return { key: "week", offset: -1 };
  if (text === "this month") return { key: "month", offset: 0 };
  if (text === "last month") return { key: "month", offset: -1 };
  if (text === "this quarter") return { key: "quarter", offset: 0 };
  if (text === "last quarter") return { key: "quarter", offset: -1 };
  if (text === "this year") return { key: "year", offset: 0 };
  if (text === "last year") return { key: "year", offset: -1 };

  /* ------------------------------------------------------- quarter, half */

  let match = /^q([1-4])(?: (\d{2,4}))?$/.exec(text) ?? /^(?:(\d{4}) )?q([1-4])$/.exec(text);
  if (match) {
    // the two patterns put the capture groups the other way round
    const [quarter, year] = /^q/.test(text)
      ? [Number(match[1]), fullYear(match[2], thisYear)]
      : [Number(match[2]), fullYear(match[1], thisYear)];
    return { key: "quarter", offset: offsetFor("quarter", new Date(year, (quarter - 1) * 3, 1), now) };
  }

  match = /^h([12])(?: (\d{2,4}))?$/.exec(text);
  if (match) {
    const half = Number(match[1]);
    const year = fullYear(match[2], thisYear);
    return { key: "half", offset: offsetFor("half", new Date(year, (half - 1) * 6, 1), now) };
  }

  /* -------------------------------------------------------- numeric only */

  match = /^(\d{4})$/.exec(text);
  if (match) {
    return { key: "year", offset: offsetFor("year", new Date(Number(match[1]), 0, 1), now) };
  }

  /* ----------------------------------------------------------- full dates */

  match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (match) {
    return day(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }

  // month/day, US order, to match how dates are shown elsewhere in the app
  match = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(text);
  if (match) {
    const month = Number(match[1]) - 1;
    const date = Number(match[2]);
    if (month > 11 || date > 31) return null;
    return day(new Date(fullYear(match[3], thisYear), month, date));
  }

  /* ------------------------------------------------------ month and words */

  // "july 1", "jul 1st 2024"
  match = /^([a-z]+) (\d{1,2})(?:st|nd|rd|th)?(?: (\d{2,4}))?$/.exec(text);
  if (match) {
    const month = monthFromWord(match[1]);
    if (month >= 0 && Number(match[2]) <= 31) {
      return day(new Date(fullYear(match[3], thisYear), month, Number(match[2])));
    }
  }

  // "1 july", "1st july 2024"
  match = /^(\d{1,2})(?:st|nd|rd|th)? ([a-z]+)(?: (\d{2,4}))?$/.exec(text);
  if (match) {
    const month = monthFromWord(match[2]);
    if (month >= 0 && Number(match[1]) <= 31) {
      return day(new Date(fullYear(match[3], thisYear), month, Number(match[1])));
    }
  }

  // "august", "august 2024"
  match = /^([a-z]+)(?: (\d{2,4}))?$/.exec(text);
  if (match) {
    const month = monthFromWord(match[1]);
    if (month >= 0) {
      return {
        key: "month",
        offset: offsetFor("month", new Date(fullYear(match[2], thisYear), month, 1), now),
      };
    }
  }

  return null;
}
