import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
import { faqs } from "@/lib/data/faqData";

const columns = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All products" },
      { href: "/shop-from-china", label: "Shop from China" },
      { href: "/shop/usa", label: "Shop from USA" },
      { href: "/shop/uk", label: "Shop from UK" },
      { href: "/shop/international", label: "International Stores" },
      { href: "/shop?wholesale=1", label: "Wholesale deals" },
    ],
  },
  {
    title: "Services",
    links: [
      { href: "/shop-for-me", label: "Shop for Me" },
      { href: "/source-a-product", label: "Source a Product" },
      { href: "/account/ship-package", label: "Ship my package" },
      { href: "/track", label: "Track a shipment" },
      { href: "/legal/shipping-policy", label: "Worldwide Shipping" },
      { href: "/countries", label: "Supported Countries" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About ATG Mall" },
      { href: "mailto:support@apexterraglobal.com", label: "Contact us" },
      { href: "https://apexterraglobal.com", label: "Apex Terra Global ↗" },
      { href: "/support", label: "Help & support" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/terms", label: "Terms & Conditions" },
      { href: "/legal/privacy", label: "Privacy Policy" },
      { href: "/legal/refund-policy", label: "Refund Policy" },
      { href: "/legal/shipping-policy", label: "Shipping Policy" },
      { href: "/legal/prohibited-items", label: "Prohibited Items" },
      { href: "/legal/seller-terms", label: "Seller Terms" },
      { href: "/legal/customer-agreement", label: "Customer Agreement" },
    ],
  },
];

type Column = (typeof columns)[number];

// Shared between the mobile <details> body and the always-open desktop
// column — kept as one component so the two render paths can't drift.
function ColumnLinks({ col }: { col: Column }) {
  return (
    <ul className="space-y-2">
      {col.links.map((link) => (
        <li key={link.href}>
          <Link href={link.href} className="text-sm text-navy-300 hover:text-white">
            {link.label}
          </Link>
        </li>
      ))}
      {col.title === "Company" && (
        <>
          <li>
            <details className="group/faq">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm text-navy-300 hover:text-white">
                FAQ
                <span className="ml-2 shrink-0 text-navy-500 transition-transform group-open/faq:rotate-45">+</span>
              </summary>
              <div className="mt-3 space-y-3 border-l border-white/10 pl-3">
                {faqs.map((f) => (
                  <details key={f.q}>
                    <summary className="cursor-pointer list-none text-xs font-medium text-navy-200 hover:text-white">
                      {f.q}
                    </summary>
                    <p className="mt-1.5 text-xs leading-relaxed text-navy-400">{f.a}</p>
                  </details>
                ))}
              </div>
            </details>
          </li>
          <li className="empty:hidden">
            <InstallAppButton className="text-sm text-navy-300 hover:text-white" />
          </li>
        </>
      )}
    </ul>
  );
}

export function Footer() {
  return (
    <footer className="bg-navy-900 pb-16 text-navy-200 lg:pb-0">
      <div className="container-atg grid grid-cols-2 gap-10 py-14 sm:grid-cols-3 lg:grid-cols-6">
        <div className="col-span-2 lg:col-span-2">
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-navy-300">
            Shop products from China, the USA, the UK and beyond, delivered to supported
            destinations worldwide. We handle sourcing, purchasing, receiving, consolidation
            and international shipping.
          </p>
          <div className="mt-5 space-y-1 text-sm text-navy-300">
            <p>WhatsApp/Call: <a href="tel:+2347043945345" className="hover:text-white">+234 704 394 5345</a></p>
            <p>Email: <a href="mailto:support@apexterraglobal.com" className="hover:text-white">support@apexterraglobal.com</a></p>
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            {/*
              Two separate render paths rather than one <details> forced open
              via CSS at the lg breakpoint: modern Chromium hides closed
              <details> content with `content-visibility: hidden`, not plain
              `display: none` — that collapses the box to 0x0 regardless of
              any `display` override on descendants, so a CSS-only "force
              open on desktop" trick doesn't actually work. A plain always-
              visible column for desktop sidesteps the whole thing.
            */}
            <details className="group/col lg:hidden">
              <summary className="mb-3 flex cursor-pointer list-none items-center justify-between text-xs font-bold uppercase tracking-wider text-navy-400">
                {col.title}
                <span className="text-sm text-navy-500 transition-transform group-open/col:rotate-45">+</span>
              </summary>
              <ColumnLinks col={col} />
            </details>
            <div className="hidden lg:block">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-navy-400">{col.title}</h3>
              <ColumnLinks col={col} />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="container-atg flex flex-col gap-2 py-6 text-xs text-navy-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ATG Mall. All rights reserved.</p>
          <p className="font-medium text-navy-300">
            ATG Mall is a product of <span className="text-white">Apex Terra Global Limited</span>, Nigeria — a
            separate consumer shopping platform from the corporate{" "}
            <a href="https://apexterraglobal.com" className="underline hover:text-white">
              apexterraglobal.com
            </a>{" "}
            website.
          </p>
        </div>
      </div>
    </footer>
  );
}
