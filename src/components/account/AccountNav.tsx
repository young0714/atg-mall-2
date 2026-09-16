"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string; group: "primary" | "more" };

// "primary" links stay visible as pills on mobile; "more" links are tucked
// behind the "More" dropdown there to keep the row short enough that Wallet
// doesn't require scrolling to find. Desktop's sidebar ignores the grouping
// entirely and renders every link flat, in this same order.
const links: NavLink[] = [
  { href: "/account", label: "Overview", group: "primary" },
  { href: "/account/orders", label: "My Orders", group: "primary" },
  { href: "/account/packages", label: "My Packages", group: "primary" },
  { href: "/account/ship-package", label: "Ship My Package", group: "primary" },
  { href: "/account/shop-for-me", label: "Shop For Me Requests", group: "more" },
  { href: "/account/sourcing", label: "Sourcing Requests", group: "more" },
  { href: "/account/quotations", label: "Quotations", group: "more" },
  { href: "/account/wallet", label: "Wallet", group: "primary" },
  { href: "/account/notifications", label: "Notifications", group: "more" },
  { href: "/account/profile", label: "Profile & Addresses", group: "more" },
  { href: "/account/security", label: "Security", group: "more" },
];

function isActive(pathname: string, href: string) {
  return href === "/account" ? pathname === "/account" : pathname.startsWith(href);
}

function NavLinkPill({
  link,
  active,
  unreadCount,
  onClick,
  className,
}: {
  link: NavLink;
  active: boolean;
  unreadCount?: number;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={link.href}
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center justify-between gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium",
        active ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-sand-100",
        className,
      )}
    >
      {link.label}
      {link.href === "/account/notifications" && !!unreadCount && (
        <span className="rounded-full bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {unreadCount}
        </span>
      )}
    </Link>
  );
}

export function AccountNav({ unreadNotifications = 0 }: { unreadNotifications?: number }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryLinks = links.filter((l) => l.group === "primary");
  const moreLinks = links.filter((l) => l.group === "more");
  const moreActive = moreLinks.some((l) => isActive(pathname, l.href));

  return (
    <>
      {/* Desktop: full flat vertical list, unchanged from before the mobile grouping. */}
      <nav className="hidden rounded-xl2 border border-navy-100 bg-white p-1.5 lg:flex lg:flex-col lg:gap-1">
        {links.map((link) => (
          <NavLinkPill key={link.href} link={link} active={isActive(pathname, link.href)} unreadCount={unreadNotifications} />
        ))}
      </nav>

      {/* Mobile: primary pills + a "More" dropdown for the rest. The
          dropdown panel lives in this outer wrapper, NOT inside the
          scrollable <nav> below — setting overflow-x on an element forces
          its overflow-y to "auto" too (a CSS overflow-computation quirk),
          which would silently clip an absolutely-positioned child that
          extends past the nav's own box, even though the click that opens
          it still fires normally. Keeping the panel a sibling of the
          scrollable nav, inside this non-overflowing wrapper, avoids that
          entirely. */}
      <div className="relative lg:hidden">
        <nav className="flex gap-1 overflow-x-auto whitespace-nowrap rounded-xl2 border border-navy-100 bg-white p-1.5">
          {primaryLinks.map((link) => (
            <NavLinkPill key={link.href} link={link} active={isActive(pathname, link.href)} />
          ))}

          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-sm font-medium",
              moreActive ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-sand-100",
            )}
          >
            More
            {unreadNotifications > 0 && (
              <span className="rounded-full bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadNotifications}
              </span>
            )}
          </button>
        </nav>

        {moreOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-1 flex w-60 flex-col gap-1 rounded-xl2 border border-navy-100 bg-white p-1.5 shadow-lg"
            >
              {moreLinks.map((link) => (
                <NavLinkPill
                  key={link.href}
                  link={link}
                  active={isActive(pathname, link.href)}
                  unreadCount={unreadNotifications}
                  onClick={() => setMoreOpen(false)}
                  className="w-full"
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
