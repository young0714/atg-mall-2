/** Time left until an end moment, as "3d 04h 12m 05s". `over` is true once it has passed. */
export function remaining(endsAtIso: string, now: number = Date.now()): { text: string; over: boolean } {
  const s = Math.floor((new Date(endsAtIso).getTime() - now) / 1000);
  if (s <= 0) return { text: "", over: true };
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { text: `${d > 0 ? `${d}d ` : ""}${pad(h)}h ${pad(m)}m ${pad(sec)}s`, over: false };
}
