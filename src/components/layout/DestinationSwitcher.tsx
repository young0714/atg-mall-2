"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { DESTINATION_COOKIE } from "@/lib/constants";
import type { Country } from "@prisma/client";

const OPTIONS: { country: Country; label: string; flag: string }[] = [
  { country: "NIGERIA", label: "Nigeria", flag: "🇳🇬" },
  { country: "GAMBIA", label: "Gambia", flag: "🇬🇲" },
];

export function DestinationSwitcher({
  current,
  variant = "light",
}: {
  current: Country;
  variant?: "light" | "dark";
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function select(country: Country) {
    document.cookie = `${DESTINATION_COOKIE}=${country}; path=/; max-age=${60 * 60 * 24 * 365}`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-1 rounded-full border px-1 py-1 text-xs font-semibold"
      style={{ borderColor: variant === "dark" ? "rgba(255,255,255,0.25)" : "#d6e0ec" }}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.country}
          type="button"
          onClick={() => select(opt.country)}
          className={
            "rounded-full px-2.5 py-1 transition-colors " +
            (opt.country === current
              ? variant === "dark"
                ? "bg-white text-navy-900"
                : "bg-navy-900 text-white"
              : variant === "dark"
                ? "text-white/70 hover:text-white"
                : "text-navy-500 hover:text-navy-800")
          }
        >
          {opt.flag} {opt.label}
        </button>
      ))}
    </div>
  );
}
