/**
 * TimeTrack identity.
 *
 * The mark is a "T" whose stem drops through a gap in an open ring:
 * the ring is time as a continuous cycle, the gap is the moment in progress,
 * the stem is both the letterform and a hand resting at twelve.
 * No stopwatch, no clock face.
 *
 * Everything is drawn in `currentColor` so the mark inverts cleanly on the
 * olive navigation, on cream, or in a single-colour context. The stem may be
 * rendered in the action orange for the full-colour lockup.
 */

type MarkProps = {
  className?: string;
  /** Draw the stem in the action orange. Set false for one-colour use. */
  accent?: boolean;
};

export function LogoMark({ className, accent = true }: MarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      {/* open ring — continuity, with a gap at the top for the moment in progress */}
      <path d="M9.04 7.66A7 7 0 1 0 14.96 7.66" />
      {/* crossbar of the T */}
      <path d="M5 4.2h14" />
      {/* stem of the T, falling through the gap to the centre */}
      <path d="M12 4.2v9.8" className={accent ? "text-orange" : undefined} stroke="currentColor" />
    </svg>
  );
}

type LogoProps = MarkProps & {
  /** Hide the wordmark, e.g. on very narrow layouts. */
  markOnly?: boolean;
};

export function Logo({ className, accent = true, markOnly = false }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark className="size-[22px]" accent={accent} />
      {!markOnly && (
        <span className="text-[17px] tracking-[-0.02em] whitespace-nowrap">
          <span className="font-semibold">Time</span>
          <span className="font-normal opacity-80">Track</span>
        </span>
      )}
    </span>
  );
}
