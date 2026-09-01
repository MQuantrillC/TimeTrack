/**
 * Minimal line icons — 24px grid, 1.75 stroke, round caps and joins.
 * Same geometric language as Lucide, kept dependency-free.
 */

type IconProps = { className?: string };

function Icon({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export function PlayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M8 5.6 18.4 12 8 18.4Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PauseIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M9.5 6v12M14.5 6v12" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 5.5v13M5.5 12h13" />
    </Icon>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
    </Icon>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="11" cy="11" r="6.25" />
      <path d="m15.6 15.6 3.9 3.9" />
    </Icon>
  );
}

export function PencilIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12.5 20H20" />
      <path d="M16.2 4.3a1.9 1.9 0 0 1 2.7 2.7L7.6 18.3 4 19.3l1-3.6Z" />
    </Icon>
  );
}

export function CloudIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M7 18.5a4 4 0 0 1-.4-7.98 5.5 5.5 0 0 1 10.6-1.1A3.75 3.75 0 0 1 17.5 18.5Z" />
    </Icon>
  );
}

export function CloudOffIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M6.9 10.53A4 4 0 0 0 7 18.5h9.2" />
      <path d="M9.4 7.2a5.5 5.5 0 0 1 7.8 2.22A3.75 3.75 0 0 1 18.9 16" />
      <path d="M4.5 4.5 19.5 19.5" />
    </Icon>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M14.5 6.5 9 12l5.5 5.5" />
    </Icon>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M9.5 6.5 15 12l-5.5 5.5" />
    </Icon>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
    </Icon>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m5.5 12.5 4.2 4.2 8.8-9.4" />
    </Icon>
  );
}

export function CopyIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="9" y="9" width="10.5" height="10.5" rx="2.2" />
      <path d="M15 6.2A1.7 1.7 0 0 0 13.3 4.5H6.2A1.7 1.7 0 0 0 4.5 6.2v7.1A1.7 1.7 0 0 0 6.2 15" />
    </Icon>
  );
}

export function RefreshIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.5V9H15" />
    </Icon>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M4.5 7h15M10 4.5h4M6.5 7l.9 12.1h9.2L17.5 7" />
    </Icon>
  );
}
