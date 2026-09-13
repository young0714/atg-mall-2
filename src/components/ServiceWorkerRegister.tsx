"use client";

import { useEffect } from "react";

// Registers the service worker that makes the site installable and gives
// it a basic offline fallback — nothing here caches pages, prices or cart
// state, since those need to always come from the network.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability is a progressive enhancement — a failed
        // registration shouldn't affect the rest of the app.
      });
    }
  }, []);

  return null;
}
