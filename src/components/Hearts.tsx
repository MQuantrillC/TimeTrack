"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/lib/account";

/**
 * Every so often, a few hearts drift up the screen.
 *
 * Only for accounts the server marks — see lib/flair.ts. Purely decorative: the
 * layer never takes pointer events, sits below dialogs, and is skipped entirely
 * for anyone who has asked for reduced motion.
 */

type Heart = {
  id: number;
  left: number;
  drift: number;
  duration: number;
  delay: number;
  size: number;
  tone: string;
};

const TONES = ["var(--color-blush)", "var(--color-mauve)", "var(--color-peach)"];

const FIRST_WAIT_MS = 9_000;
const GAP_MIN_MS = 70_000;
const GAP_SPREAD_MS = 70_000;
/** Longest a heart can be on screen: the slowest rise plus the latest start. */
const LIFETIME_MS = 14_000;

export function Hearts() {
  const { hearts: enabled } = useAccount();
  const [flock, setFlock] = useState<Heart[]>([]);

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timers: number[] = [];
    let nextId = 0;

    const release = () => {
      const batch = Array.from({ length: 5 + Math.floor(Math.random() * 5) }, () => ({
        id: nextId++,
        left: 4 + Math.random() * 92,
        drift: (Math.random() - 0.5) * 140,
        duration: 6 + Math.random() * 4,
        delay: Math.random() * 2.5,
        size: 14 + Math.random() * 18,
        tone: TONES[Math.floor(Math.random() * TONES.length)],
      }));
      setFlock((current) => [...current, ...batch]);

      const ids = new Set(batch.map((heart) => heart.id));
      timers.push(
        window.setTimeout(
          () => setFlock((current) => current.filter((heart) => !ids.has(heart.id))),
          LIFETIME_MS,
        ),
      );
      timers.push(
        window.setTimeout(release, GAP_MIN_MS + Math.random() * GAP_SPREAD_MS),
      );
    };

    timers.push(window.setTimeout(release, FIRST_WAIT_MS));
    return () => {
      timers.forEach(window.clearTimeout);
      setFlock([]);
    };
  }, [enabled]);

  if (!enabled || flock.length === 0) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {flock.map((heart) => (
        <span
          key={heart.id}
          className="heart"
          style={{
            left: `${heart.left}%`,
            width: `${heart.size}px`,
            height: `${heart.size}px`,
            color: heart.tone,
            animationDuration: `${heart.duration}s`,
            animationDelay: `${heart.delay}s`,
            ["--drift" as string]: `${heart.drift}px`,
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-full">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </span>
      ))}
    </div>
  );
}
