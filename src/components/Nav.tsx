"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

const LINKS = [
  { href: "/", label: "Timer" },
  { href: "/projects", label: "Projects" },
  { href: "/history", label: "History" },
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="bg-olive text-canvas">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
        <Link href="/" aria-label="TimeTrack home" className="text-canvas">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-canvas/15 font-medium text-canvas"
                    : "text-canvas/65 hover:bg-canvas/10 hover:text-canvas"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
