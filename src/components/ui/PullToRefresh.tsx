"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const PULL_THRESHOLD = 70; // px of pull needed to trigger a refresh
const MAX_PULL = 110; // visual cap so the indicator doesn't overshoot

/**
 * Wraps dashboard-style content (orders, wallet, notifications — anything
 * whose data can change server-side between visits) with a mobile
 * pull-to-refresh gesture. Only touch events drive this, so it's inert on
 * desktop/mouse input by construction — no viewport check needed.
 *
 * Re-syncs via router.refresh() (re-fetches the current route's Server
 * Component data in place) rather than a full page reload, so scroll
 * position and client state elsewhere on the page aren't lost.
 */
export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Only start tracking a pull from the very top of the page —
      // otherwise this fights a normal downward scroll mid-page.
      if (window.scrollY > 0 || refreshing) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    },
    [refreshing],
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }
    // Diminishing return past the raw delta so it feels like resistance
    // rather than a 1:1 drag.
    setPullDistance(Math.min(delta * 0.5, MAX_PULL));
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!pulling.current) return;
    pulling.current = false;
    startY.current = null;

    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      router.refresh();
      // router.refresh() doesn't expose a "done" signal we can await, so
      // give the spinner a beat to register before collapsing back.
      setTimeout(() => {
        setRefreshing(false);
        setPullDistance(0);
      }, 700);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, router]);

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out"
        style={{ height: pullDistance }}
        aria-hidden={pullDistance === 0}
      >
        <div
          className={`h-6 w-6 rounded-full border-2 border-atggreen-200 border-t-atggreen-600 ${refreshing ? "animate-spin" : ""}`}
          style={{
            opacity: Math.min(pullDistance / PULL_THRESHOLD, 1),
            transform: refreshing ? undefined : `rotate(${pullDistance * 3}deg)`,
          }}
        />
      </div>
      {children}
    </div>
  );
}
