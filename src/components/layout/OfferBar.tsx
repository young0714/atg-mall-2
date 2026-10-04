"use client";

import { useEffect, useState } from "react";
import { OFFER_COOKIE } from "@/lib/offerCookie";

interface Offer {
  code: string;
  percentOff: number;
  headline: string;
  endsAtIso: string;
  showCountdown: boolean;
}

function remaining(endsAtIso: string): { text: string; over: boolean } {
  const s = Math.floor((new Date(endsAtIso).getTime() - Date.now()) / 1000);
  if (s <= 0) return { text: "", over: true };
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { text: `${d > 0 ? `${d}d ` : ""}${pad(h)}h ${pad(m)}m ${pad(sec)}s`, over: false };
}

/**
 * Site-wide offer bar. "Claim offer" only remembers the code in a cookie; the
 * server re-checks every rule at checkout, so a stale claim can never cheat.
 */
export function OfferBar({ offer, initiallyClaimed }: { offer: Offer; initiallyClaimed: boolean }) {
  const [claimed, setClaimed] = useState(initiallyClaimed);
  const [left, setLeft] = useState<{ text: string; over: boolean } | null>(null); // computed after mount: avoids a server/browser clock mismatch

  useEffect(() => {
    if (!offer.showCountdown) {
      setLeft(remaining(offer.endsAtIso));
      return;
    }
    const tick = () => setLeft(remaining(offer.endsAtIso));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [offer.endsAtIso, offer.showCountdown]);

  if (left?.over) return null; // the offer has ended while the page was open

  function claim() {
    try {
      document.cookie = `${OFFER_COOKIE}=${encodeURIComponent(offer.code)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    } catch {
      // Cookies blocked: the customer can still type the code at checkout.
    }
    setClaimed(true);
  }

  const endDate = new Date(offer.endsAtIso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <div className="bg-atggreen-700 px-3 py-2 text-center text-sm text-white" role="region" aria-label="Special offer">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span className="font-semibold">{offer.headline}</span>
        {claimed ? (
          <span>Offer claimed. We&apos;ll apply <strong>{offer.code}</strong> at checkout.</span>
        ) : (
          <>
            <span>
              Use code <strong className="rounded bg-white/15 px-1.5 py-0.5 font-mono">{offer.code}</strong>
            </span>
            <button
              type="button"
              onClick={claim}
              className="rounded-full bg-white px-3 py-0.5 text-xs font-semibold text-atggreen-700 hover:bg-atggreen-50"
            >
              Claim offer
            </button>
          </>
        )}
        <span className="text-white/90">
          {offer.showCountdown && left && !left.over ? (
            <>Ends in <span className="font-mono font-semibold tabular-nums">{left.text}</span></>
          ) : (
            <>Ends {endDate}</>
          )}
        </span>
      </div>
    </div>
  );
}
