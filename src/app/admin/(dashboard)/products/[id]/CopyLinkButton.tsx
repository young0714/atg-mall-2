"use client";

import { useState } from "react";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be blocked (permissions, non-HTTPS context) —
      // fail quietly rather than throwing in the admin's face over a
      // convenience feature.
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-navy-200 bg-sand-50 px-3 py-2">
      <span className="min-w-0 flex-1 truncate text-xs text-navy-500" title={url}>
        {url}
      </span>
      <button type="button" onClick={handleCopy} className="btn-outline btn-sm shrink-0">
        {copied ? "Copied!" : "Copy Link"}
      </button>
    </div>
  );
}
