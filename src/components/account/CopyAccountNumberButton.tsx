"use client";

import { useState } from "react";

export function CopyAccountNumberButton({ accountNumber }: { accountNumber: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context) — the
      // number is already visible on screen, so there's nothing more to do.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-xs font-semibold text-atgblue-600 hover:text-atgblue-700"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
