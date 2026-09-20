"use client";

import { useEffect, useState } from "react";
import { useInstallPrompt } from "@/lib/hooks/useInstallPrompt";

const DISMISSED_KEY = "atg_install_banner_dismissed";

/**
 * A one-time top banner nudging people to install the PWA, since most
 * visitors don't know a website can be installed at all, and the steps are
 * completely different (and undiscoverable) between Android and iOS. Once
 * dismissed or installed, this never shows again — InstallAppButton (in the
 * footer) stays as the permanent, quiet way back to it.
 */
export function InstallAppBanner() {
  const { canInstall, isIOS, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(true); // default hidden until localStorage is checked, avoids a flash
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed || !canInstall) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Private browsing or blocked storage — the banner just won't
      // remember the dismissal next visit, which is a harmless fallback.
    }
  }

  async function handleInstallClick() {
    if (isIOS) {
      setShowIOSSteps(true);
      return;
    }
    const accepted = await promptInstall();
    if (accepted) dismiss();
  }

  return (
    <div className="border-b border-atgblue-100 bg-atgblue-50">
      <div className="container-atg flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
        {showIOSSteps ? (
          <p className="text-atgblue-800">
            Tap <strong>Share</strong> <span aria-hidden>⬆️</span> in Safari, then <strong>&quot;Add to Home Screen.&quot;</strong>
          </p>
        ) : (
          <p className="text-atgblue-800">Install ATG Mall for quicker access, no App Store needed.</p>
        )}
        <div className="flex shrink-0 items-center gap-2">
          {!showIOSSteps && (
            <button type="button" onClick={handleInstallClick} className="btn-primary btn-sm">
              Install App
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="rounded-full p-1.5 text-atgblue-600 hover:bg-atgblue-100"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
