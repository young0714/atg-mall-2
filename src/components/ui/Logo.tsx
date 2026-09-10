import { cn } from "@/lib/utils";

/**
 * ATG Mall wordmark — an original mark, not a copy of any existing brand.
 * The globe-and-route glyph reads as "cross-border logistics"; the gold dot
 * stands in for the destination (Nigeria/Gambia). Pure inline SVG so it
 * renders crisply at any size with no external asset.
 */
export function Logo({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden>
        <circle cx="17" cy="17" r="16" stroke={dark ? "#0F2038" : "#ffffff"} strokeOpacity={dark ? 1 : 0.35} strokeWidth="1.4" />
        <path
          d="M4 17c3-4 7-6 13-6s10 2 13 6M4 17c3 4 7 6 13 6s10-2 13-6M17 1c3.2 4 4.8 9.4 4.8 16S20.2 29 17 33M17 1c-3.2 4-4.8 9.4-4.8 16S13.8 29 17 33"
          stroke={dark ? "#1F6CE0" : "#7fb2ff"}
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <path d="M17 1v32" stroke={dark ? "#0F2038" : "#ffffff"} strokeOpacity={dark ? 0.5 : 0.35} strokeWidth="1.1" />
        <circle cx="25.5" cy="10" r="3.4" fill="#DBA934" stroke={dark ? "#0F2038" : "#0F2038"} strokeWidth="1" />
      </svg>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-lg font-extrabold tracking-tight",
            dark ? "text-navy-900" : "text-white",
          )}
        >
          ATG <span className="text-atgblue-500">Mall</span>
        </span>
        <span
          className={cn(
            "text-[9px] font-semibold uppercase tracking-[0.18em]",
            dark ? "text-navy-400" : "text-navy-200",
          )}
        >
          by Apex Terra Global
        </span>
      </span>
    </span>
  );
}
