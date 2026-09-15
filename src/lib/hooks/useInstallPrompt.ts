"use client";

import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Module-level (not React state), so every component using this hook shares
// the same captured event and consumption state. beforeinstallprompt is a
// one-shot native event — .prompt() can only be called on it once — but
// InstallAppBanner and InstallAppButton can both be mounted at the same
// time, each with its own hook call. If each held its own copy of the
// event, whichever one the user clicked second would fail. A module-level
// singleton plus a tiny subscriber list keeps every mounted instance in
// sync instead.
let sharedDeferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function setSharedPrompt(evt: BeforeInstallPromptEvent | null) {
  sharedDeferredPrompt = evt;
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    setSharedPrompt(e as BeforeInstallPromptEvent);
  });
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
  const [, forceRender] = useState(0);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true,
    );
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const listener = () => forceRender((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!sharedDeferredPrompt) return false;
    const evt = sharedDeferredPrompt;
    setSharedPrompt(null); // consume immediately so no other mounted caller can reuse it
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === "accepted") setIsStandalone(true);
    return outcome === "accepted";
  }, []);

  const canInstall = !isStandalone && (!!sharedDeferredPrompt || isIOS);

  return { canInstall, isIOS, isStandalone, promptInstall };
}
