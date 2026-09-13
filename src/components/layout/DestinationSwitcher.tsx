"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { DESTINATION_COOKIE, isoToFlagEmoji } from "@/lib/constants";

export function DestinationSwitcher({
  current,
  countries,
  variant = "light",
}: {
  current: string;
  countries: { isoCode: string; name: string }[];
  variant?: "light" | "dark";
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function select(isoCode: string) {
    document.cookie = `${DESTINATION_COOKIE}=${isoCode}; path=/; max-age=${60 * 60 * 24 * 365}`;
    startTransition(() => router.refresh());
  }

  return (
    <select
      aria-label="Shopping destination"
      value={current}
      onChange={(e) => select(e.target.value)}
      className={
        "rounded-full border bg-transparent px-2.5 py-1 text-xs font-semibold " +
        (variant === "dark" ? "border-white/25 text-white" : "border-[#d6e0ec] text-navy-700")
      }
      style={variant === "dark" ? { colorScheme: "dark" } : undefined}
    >
      {countries.map((c) => (
        <option key={c.isoCode} value={c.isoCode} className="text-navy-900">
          {isoToFlagEmoji(c.isoCode)} {c.name}
        </option>
      ))}
    </select>
  );
}
