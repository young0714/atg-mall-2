import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { DestinationSwitcher } from "./DestinationSwitcher";
import { getDestination } from "@/lib/destination";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isStaffRole } from "@/lib/rbac";

const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/shop-for-me", label: "Shop For Me" },
  { href: "/source-a-product", label: "Source A Product" },
  { href: "/track", label: "Track Shipment" },
];

export async function Header() {
  const destination = getDestination();
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/95 backdrop-blur">
      <div className="hidden bg-navy-900 text-white lg:block">
        <div className="container-atg flex h-9 items-center justify-between text-xs">
          <p className="text-navy-200">
            A product of <span className="font-semibold text-white">Apex Terra Global Limited</span> · Nigeria
          </p>
          <div className="flex items-center gap-5 text-navy-200">
            <a href="tel:+2347043945345" className="hover:text-white">
              WhatsApp/Call: +234 704 394 5345
            </a>
            <a href="mailto:support@apexterraglobal.com" className="hover:text-white">
              support@apexterraglobal.com
            </a>
          </div>
        </div>
      </div>

      <div className="container-atg flex h-16 items-center justify-between gap-4 sm:gap-6">
        <Link href="/" aria-label="ATG Mall home">
          <Logo dark />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          <Link href="/" className="text-sm font-medium text-navy-600 hover:text-navy-900">
            Home
          </Link>
          <div className="group relative">
            <button className="flex items-center gap-1 text-sm font-medium text-navy-600 hover:text-navy-900">
              Shop From China
              <svg width="10" height="10" viewBox="0 0 10 6" fill="none">
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </button>
            <div className="invisible absolute left-0 top-full z-50 w-56 rounded-xl border border-navy-100 bg-white p-2 opacity-0 shadow-card-hover transition-all group-hover:visible group-hover:opacity-100">
              <Link href="/shop-from-china" className="block rounded-lg px-3 py-2 text-sm text-navy-700 hover:bg-sand-100">
                Overview
              </Link>
              <Link href="/shop-from-china/1688" className="block rounded-lg px-3 py-2 text-sm text-navy-700 hover:bg-sand-100">
                1688
              </Link>
              <Link href="/shop-from-china/taobao" className="block rounded-lg px-3 py-2 text-sm text-navy-700 hover:bg-sand-100">
                Taobao
              </Link>
            </div>
          </div>
          {NAV_LINKS.filter((l) => l.href !== "/shop").map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-navy-600 hover:text-navy-900">
              {link.label}
            </Link>
          ))}
          <Link href="/shop" className="text-sm font-medium text-navy-600 hover:text-navy-900">
            Shop
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <DestinationSwitcher current={destination.country} />
          </div>
          <Link href="/cart" aria-label="Cart" className="rounded-full p-2 text-navy-700 hover:bg-sand-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 3h2l2.4 12.4a2 2 0 002 1.6h8.4a2 2 0 002-1.6L21 8H6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="21" r="1.4" fill="currentColor" />
              <circle cx="18" cy="21" r="1.4" fill="currentColor" />
            </svg>
          </Link>
          {user ? (
            <div className="group relative hidden sm:block">
              <Link href={isStaffRole(user.role) ? "/admin" : "/account"} className="btn-outline btn-sm">
                {isStaffRole(user.role) ? "Admin Console" : `Hi, ${user.fullName.split(" ")[0]}`}
              </Link>
              <div className="invisible absolute right-0 top-full z-50 w-52 rounded-xl border border-navy-100 bg-white p-2 opacity-0 shadow-card-hover transition-all group-hover:visible group-hover:opacity-100">
                <Link href="/account" className="block rounded-lg px-3 py-2 text-sm text-navy-700 hover:bg-sand-100">Account overview</Link>
                <Link href="/account/orders" className="block rounded-lg px-3 py-2 text-sm text-navy-700 hover:bg-sand-100">My Orders</Link>
                <Link href="/account/packages" className="block rounded-lg px-3 py-2 text-sm text-navy-700 hover:bg-sand-100">My Packages</Link>
                <Link href="/account/wallet" className="block rounded-lg px-3 py-2 text-sm text-navy-700 hover:bg-sand-100">Wallet</Link>
                <Link href="/account/ship-package" className="block rounded-lg px-3 py-2 text-sm text-navy-700 hover:bg-sand-100">Ship My Package</Link>
                <Link href="/support" className="block rounded-lg px-3 py-2 text-sm text-navy-700 hover:bg-sand-100">Support</Link>
                <form action="/api/v1/auth/logout" method="POST">
                  <button className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50">
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className="btn-ghost btn-sm">Sign in</Link>
              <Link href="/register" className="btn-primary btn-sm">Create account</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
