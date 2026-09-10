"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "My Orders" },
  { href: "/account/packages", label: "My Packages" },
  { href: "/account/ship-package", label: "Ship My Package" },
  { href: "/account/shop-for-me", label: "Shop For Me Requests" },
  { href: "/account/sourcing", label: "Sourcing Requests" },
  { href: "/account/quotations", label: "Quotations" },
  { href: "/account/wallet", label: "Wallet" },
  { href: "/account/profile", label: "Profile & Addresses" },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto whitespace-nowrap rounded-xl2 border border-navy-100 bg-white p-1.5 lg:flex-col lg:whitespace-normal">
      {links.map((link) => {
        const active = link.href === "/account" ? pathname === "/account" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "shrink-0 rounded-lg px-3.5 py-2.5 text-sm font-medium",
              active ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-sand-100",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
