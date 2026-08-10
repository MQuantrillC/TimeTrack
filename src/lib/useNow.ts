"use client";

import { useEffect, useState } from "react";

/**
 * Current timestamp, refreshed once a second while `active`.
 * Elapsed time is always derived from this against a stored start timestamp,
 * so a throttled tab, a sleeping machine or a refresh cannot drift the clock.
 */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [active]);

  return now;
}
