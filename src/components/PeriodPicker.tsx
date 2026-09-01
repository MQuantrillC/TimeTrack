"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/components/icons";
import { parsePeriod } from "@/lib/parsePeriod";
import {
  GRANULARITIES,
  MONTHS,
  offsetFor,
  periodRange,
  type PeriodKey,
} from "@/lib/period";
import { startOfDay, startOfWeek } from "@/lib/time";

type Props = {
  period: PeriodKey;
  offset: number;
  now: number;
  onChange: (period: PeriodKey, offset: number) => void;
};

const WEEKDAY_INITIALS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** Six weeks of dates covering the given month, starting on a Sunday. */
function calendarGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function PeriodPicker({ period, offset, now, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [unparsed, setUnparsed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const range = periodRange(period, offset, now);
  // the picker always browses a granularity; "all" opens on days
  const granularity: Exclude<PeriodKey, "all"> = period === "all" ? "day" : period;
  const anchor = new Date(range.start ?? startOfDay(now));

  // which month or block of years the body is showing, independent of selection
  const [viewYear, setViewYear] = useState(anchor.getFullYear());
  const [viewMonth, setViewMonth] = useState(anchor.getMonth());

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const openPicker = () => {
    const from = new Date(periodRange(period, offset, now).start ?? startOfDay(now));
    setViewYear(from.getFullYear());
    setViewMonth(from.getMonth());
    setQuery("");
    setUnparsed(false);
    setOpen(true);
  };

  const commit = (key: PeriodKey, nextOffset: number) => {
    onChange(key, Math.min(0, nextOffset));
    setOpen(false);
  };

  const submitQuery = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parsePeriod(query, now);
    if (!parsed) {
      setUnparsed(true);
      return;
    }
    commit(parsed.key, parsed.offset);
  };

  const pick = (key: Exclude<PeriodKey, "all">, target: Date) =>
    commit(key, offsetFor(key, target, now));

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`inline-flex items-center gap-2 rounded-lg border bg-surface px-3 py-1.5 text-[13px] font-medium transition-colors ${
          open ? "border-olive text-ink ring-1 ring-olive" : "border-line-strong text-ink-muted hover:border-olive hover:text-ink"
        }`}
      >
        <CalendarIcon className="size-4" />
        {range.label ?? "All time"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a period"
          className="absolute top-full left-0 z-30 mt-1.5 w-[19.5rem] max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-3 shadow-[0_16px_40px_-12px_rgb(35_38_27/0.22)]"
        >
          <form onSubmit={submitQuery} className="relative">
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setUnparsed(false);
              }}
              placeholder="July 1, Q3 2024, last week…"
              aria-label="Type a date or period"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              className={`w-full rounded-lg border bg-canvas px-3 py-2 pr-8 text-[16px] text-ink sm:text-sm placeholder:text-ink-subtle focus:outline-none ${
                unparsed ? "border-mauve" : "border-line-strong focus:border-olive"
              }`}
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setUnparsed(false);
                }}
                aria-label="Clear what you typed"
                className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-1 text-ink-subtle hover:text-ink"
              >
                <CloseIcon className="size-3.5" />
              </button>
            )}
          </form>
          {unparsed && (
            <p role="alert" className="mt-1.5 text-xs text-mauve">
              Not a date I recognise. Try “July 1”, “August”, “Q3 2024” or “last week”.
            </p>
          )}

          <div className="mt-3 flex gap-0.5 rounded-lg bg-sunken p-0.5">
            {GRANULARITIES.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={item.key === granularity}
                onClick={() => onChange(item.key, Math.min(0, offsetFor(item.key, anchor, now)))}
                className={`flex-1 rounded-md px-1 py-1 text-[11px] font-medium transition-colors ${
                  item.key === granularity
                    ? "bg-surface text-ink shadow-[0_1px_2px_rgb(35_38_27/0.08)]"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-3">
            {granularity === "day" || granularity === "week" ? (
              <CalendarBody
                granularity={granularity}
                year={viewYear}
                month={viewMonth}
                selectedStart={range.start}
                now={now}
                onStep={(delta) => {
                  const next = new Date(viewYear, viewMonth + delta, 1);
                  setViewYear(next.getFullYear());
                  setViewMonth(next.getMonth());
                }}
                onPick={(date) => pick(granularity, date)}
              />
            ) : granularity === "month" ? (
              <MonthBody
                year={viewYear}
                selectedStart={range.start}
                now={now}
                onStep={(delta) => setViewYear(viewYear + delta)}
                onPick={(date) => pick("month", date)}
              />
            ) : granularity === "year" ? (
              <YearBody
                year={viewYear}
                selectedStart={range.start}
                now={now}
                onStep={(delta) => setViewYear(viewYear + delta * 12)}
                onPick={(date) => pick("year", date)}
              />
            ) : (
              <SegmentBody
                granularity={granularity}
                year={viewYear}
                selectedStart={range.start}
                now={now}
                onStep={(delta) => setViewYear(viewYear + delta * 4)}
                onPick={(date) => pick(granularity, date)}
              />
            )}
          </div>

          <div className="mt-3 border-t border-line pt-2">
            <button
              type="button"
              onClick={() => commit("all", 0)}
              className={`w-full rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                period === "all"
                  ? "bg-olive-tint text-olive"
                  : "text-ink-muted hover:bg-olive-tint/60 hover:text-ink"
              }`}
            >
              All time
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- body views */

function Header({
  title,
  onStep,
  canGoForward,
}: {
  title: string;
  onStep: (delta: number) => void;
  canGoForward: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-1 pb-2">
      <span className="text-[13px] font-medium text-ink">{title}</span>
      <span className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onStep(-1)}
          aria-label="Earlier"
          className="icon-btn size-7 text-ink-subtle hover:bg-olive-tint hover:text-olive"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onStep(1)}
          disabled={!canGoForward}
          aria-label="Later"
          className="icon-btn size-7 text-ink-subtle hover:bg-olive-tint hover:text-olive disabled:pointer-events-none disabled:opacity-25"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </span>
    </div>
  );
}

const cellClass = (selected: boolean, dimmed: boolean, future: boolean) =>
  `rounded-md py-1.5 text-[13px] transition-colors ${
    future
      ? "cursor-not-allowed text-line-strong"
      : selected
        ? "bg-olive-tint font-semibold text-olive ring-1 ring-olive"
        : dimmed
          ? "text-ink-subtle hover:bg-sunken"
          : "text-ink hover:bg-sunken"
  }`;

function CalendarBody({
  granularity,
  year,
  month,
  selectedStart,
  now,
  onStep,
  onPick,
}: {
  granularity: "day" | "week";
  year: number;
  month: number;
  selectedStart: number | null;
  now: number;
  onStep: (delta: number) => void;
  onPick: (date: Date) => void;
}) {
  const days = useMemo(() => calendarGrid(year, month), [year, month]);
  const today = startOfDay(now);
  const selectedWeek = selectedStart === null ? null : startOfWeek(selectedStart);

  const isSelected = (date: Date) => {
    if (selectedStart === null) return false;
    return granularity === "day"
      ? startOfDay(date.getTime()) === selectedStart
      : startOfWeek(date.getTime()) === selectedWeek;
  };

  return (
    <div>
      <Header
        title={`${MONTHS[month]} ${year}`}
        onStep={onStep}
        canGoForward={new Date(year, month + 1, 1).getTime() <= today}
      />
      <div className="grid grid-cols-7 gap-0.5 px-1 pb-1">
        {WEEKDAY_INITIALS.map((label) => (
          <span key={label} className="py-1 text-center text-[11px] text-ink-subtle">
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 px-1">
        {days.map((date) => {
          const future = startOfDay(date.getTime()) > today;
          return (
            <button
              key={date.getTime()}
              type="button"
              disabled={future}
              onClick={() => onPick(date)}
              aria-current={isSelected(date) ? "date" : undefined}
              className={cellClass(isSelected(date), date.getMonth() !== month, future)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthBody({
  year,
  selectedStart,
  now,
  onStep,
  onPick,
}: {
  year: number;
  selectedStart: number | null;
  now: number;
  onStep: (delta: number) => void;
  onPick: (date: Date) => void;
}) {
  const here = new Date(now);
  return (
    <div>
      <Header title={`${year}`} onStep={onStep} canGoForward={year < here.getFullYear()} />
      <div className="grid grid-cols-3 gap-1 px-1">
        {MONTHS.map((name, index) => {
          const future = new Date(year, index, 1) > new Date(here.getFullYear(), here.getMonth(), 1);
          const selected =
            selectedStart !== null &&
            new Date(selectedStart).getFullYear() === year &&
            new Date(selectedStart).getMonth() === index;
          return (
            <button
              key={name}
              type="button"
              disabled={future}
              onClick={() => onPick(new Date(year, index, 1))}
              className={cellClass(selected, false, future)}
            >
              {name.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Quarters and half-years: a few years at a time, newest first. */
function SegmentBody({
  granularity,
  year,
  selectedStart,
  now,
  onStep,
  onPick,
}: {
  granularity: "quarter" | "half";
  year: number;
  selectedStart: number | null;
  now: number;
  onStep: (delta: number) => void;
  onPick: (date: Date) => void;
}) {
  const here = new Date(now);
  const size = granularity === "quarter" ? 3 : 6;
  const count = granularity === "quarter" ? 4 : 2;
  const prefix = granularity === "quarter" ? "Q" : "H";
  const years = [year, year - 1, year - 2, year - 3];

  return (
    <div>
      <Header
        title={`${years[3]} – ${years[0]}`}
        onStep={onStep}
        canGoForward={year < here.getFullYear()}
      />
      <div className="max-h-56 space-y-2 overflow-y-auto px-1">
        {years.map((each) => (
          <div key={each}>
            <span className="block pb-1 text-[11px] text-ink-subtle">{each}</span>
            <div className={`grid gap-1 ${count === 4 ? "grid-cols-4" : "grid-cols-2"}`}>
              {Array.from({ length: count }, (_, index) => {
                const startsAt = new Date(each, index * size, 1);
                const future = startsAt > new Date(here.getFullYear(), here.getMonth(), 1);
                const selected =
                  selectedStart !== null &&
                  new Date(selectedStart).getFullYear() === each &&
                  Math.floor(new Date(selectedStart).getMonth() / size) === index;
                return (
                  <button
                    key={index}
                    type="button"
                    disabled={future}
                    onClick={() => onPick(startsAt)}
                    className={cellClass(selected, false, future)}
                  >
                    {prefix}
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function YearBody({
  year,
  selectedStart,
  now,
  onStep,
  onPick,
}: {
  year: number;
  selectedStart: number | null;
  now: number;
  onStep: (delta: number) => void;
  onPick: (date: Date) => void;
}) {
  const currentYear = new Date(now).getFullYear();
  const years = Array.from({ length: 12 }, (_, index) => year - index);
  return (
    <div>
      <Header
        title={`${years[11]} – ${years[0]}`}
        onStep={onStep}
        canGoForward={year < currentYear}
      />
      <div className="grid grid-cols-3 gap-1 px-1">
        {years.map((each) => {
          const selected =
            selectedStart !== null && new Date(selectedStart).getFullYear() === each;
          return (
            <button
              key={each}
              type="button"
              disabled={each > currentYear}
              onClick={() => onPick(new Date(each, 0, 1))}
              className={cellClass(selected, false, each > currentYear)}
            >
              {each}
            </button>
          );
        })}
      </div>
    </div>
  );
}
