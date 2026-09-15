"use client";

import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Wraps the two very different ways a browser can "install" this PWA:
 * Chrome/Android fires `beforeinstallprompt`, which we capture so we can
 * trigger it on our own button instead of Chrome's own mini-infobar. iOS
 * Safari never fires that event at all — Apple gives websites no
 * programmatic install path — so canInstall also opens up on iOS, and
 * callers must fall back to showing the manual Share > Add to Home Screen
 * steps themselves (see isIOS).
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true,
    );
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === "accepted";
  }, [deferredPrompt]);

  const canInstall = !isStandalone && (!!deferredPrompt || isIOS);

  return { canInstall, isIOS, isStandalone, promptInstall };
}
