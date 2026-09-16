"use client";

import { useEffect, useState } from "react";
import { AppLockScreen } from "./AppLockScreen";

const UNLOCK_KEY = "atg_unlocked";

/**
 * sessionStorage is cleared the moment a tab/installed app is fully closed,
 * but survives ordinary reloads and backgrounding within the same open
 * session — which is exactly "closed = locked again, briefly switching
 * away and back = still unlocked" without needing a timer. Defaults to
 * locked (rather than checking async before deciding what to render) so a
 * locked user's real content is never server-rendered or flashed before
 * the check runs — the unlock is a one-way transition, never the reverse,
 * during this gate's lifetime.
 */
export function AppLockGate({ active, children }: { active: boolean; children: React.ReactNode }) {
  const [locked, setLocked] = useState(active);

  useEffect(() => {
    if (!active) return;
    try {
      if (sessionStorage.getItem(UNLOCK_KEY) === "1") setLocked(false);
    } catch {
      // sessionStorage unavailable (private mode, etc.) — stay locked, the safe default.
    }
  }, [active]);

  function handleUnlocked() {
    try {
      sessionStorage.setItem(UNLOCK_KEY, "1");
    } catch {
      // Nothing more to do — the in-memory state below still unlocks this page load.
    }
    setLocked(false);
  }

  if (!active) return <>{children}</>;
  if (locked) return <AppLockScreen onUnlocked={handleUnlocked} />;
  return <>{children}</>;
}
