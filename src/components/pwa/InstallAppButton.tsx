"use client";

import { useState } from "react";
import { useInstallPrompt } from "@/lib/hooks/useInstallPrompt";

/**
 * The permanent, low-key way back to installing the app — for anyone who
 * dismissed InstallAppBanner earlier, or arrived after it already ran once.
 * Renders nothing once the app is already installed or can't be installed
 * at all (e.g. an unsupported desktop browser).
 */
export function InstallAppButton({ className }: { className?: string }) {
  const { canInstall, isIOS, promptInstall } = useInstallPrompt();
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  if (!canInstall) return null;

  async function handleClick() {
    if (isIOS) {
      setShowIOSSteps((v) => !v);
      return;
    }
    await promptInstall();
  }

  return (
    <div className="relative inline-block">
      <button type="button" onClick={handleClick} className={className}>
        Install App
      </button>
      {showIOSSteps && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-xl border border-navy-100 bg-white p-3 text-xs text-navy-600 shadow-card-hover">
          Tap <strong>Share</strong> in Safari, then <strong>&quot;Add to Home Screen.&quot;</strong>
        </div>
      )}
    </div>
  );
}
