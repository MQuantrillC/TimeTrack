"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { SyncStatus } from "@/components/SyncStatus";

const LINKS = [
  { href: "/", label: "Timer" },
  { href: "/projects", label: "Projects" },
  { href: "/history", label: "History" },
] as const;

export function Nav() {
  const pathname = usePathname();

  const linkClass = (active: boolean) =>
    active
      ? "bg-canvas/15 font-medium text-canvas"
      : "text-canvas/65 hover:bg-canvas/10 hover:text-canvas";

  return (
    <header className="bg-olive text-canvas">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-2 sm:h-16">
          <Link href="/" aria-label="TimeTrack home" className="text-canvas">
            <Logo />
          </Link>

          <div className="flex items-center gap-1">
            {/* wide screens: links sit inline with the mark */}
            <nav className="hidden items-center gap-1 sm:flex">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={pathname === link.href ? "page" : undefined}
                  className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${linkClass(
                    pathname === link.href,
                  )}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <SyncStatus />
          </div>
        </div>

        {/* narrow screens: links get their own full-width row */}
        <nav className="flex gap-1 pb-2 sm:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className={`flex-1 rounded-lg py-2 text-center text-[13px] transition-colors ${linkClass(
                pathname === link.href,
              )}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
