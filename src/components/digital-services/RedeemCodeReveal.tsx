"use client";

import { useState } from "react";

export function RedeemCodeReveal({ deliveryPayload }: { deliveryPayload: unknown }) {
  const [revealed, setRevealed] = useState(false);

  const payload = deliveryPayload as { cardNumber?: string; pinCode?: string } | null;
  if (!payload || (!payload.cardNumber && !payload.pinCode)) {
    return <p className="mt-1 text-xs text-navy-400">Redeem code is still being generated. Check back shortly.</p>;
  }

  if (!revealed) {
    return (
      <button type="button" onClick={() => setRevealed(true)} className="mt-1 text-xs font-semibold text-atgblue-600">
        Reveal redeem code
      </button>
    );
  }

  return (
    <div className="mt-1 space-y-0.5 rounded-lg bg-sand-100 p-2 font-mono text-xs">
      {payload.cardNumber && <p>Code: {payload.cardNumber}</p>}
      {payload.pinCode && <p>PIN: {payload.pinCode}</p>}
    </div>
  );
}
