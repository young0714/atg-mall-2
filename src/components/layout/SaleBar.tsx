"use client";

import { useEffect, useState } from "react";
import { remaining } from "@/lib/countdown";

/** Site-wide sale bar: no code and nothing to claim, because the prices are already lower. */
export function SaleBar({ headline, endsAtIso, showCountdown }: { headline: string; endsAtIso: string; showCountdown: boolean }) {
  const [left, setLeft] = useState<{ text: string; over: boolean } | null>(null); // after mount: avoids a server/browser clock mismatch

  useEffect(() => {
    const tick = () => setLeft(remaining(endsAtIso));
    tick();
    if (!showCountdown) return;
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAtIso, showCountdown]);

  if (left?.over) return null; // the sale ended while the page was open

  const endDate = new Date(endsAtIso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <div className="bg-red-700 px-3 py-2 text-center text-sm text-white" role="region" aria-label="Sale">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span className="font-semibold">{headline}</span>
        <span className="text-white/90">
          {showCountdown && left && !left.over ? (
            <>Ends in <span className="font-mono font-semibold tabular-nums">{left.text}</span></>
          ) : (
            <>Ends {endDate}</>
          )}
        </span>
      </div>
    </div>
  );
}
