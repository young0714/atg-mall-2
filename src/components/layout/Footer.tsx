import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

const columns = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All products" },
      { href: "/shop-from-china/1688", label: "1688" },
      { href: "/shop-from-china/taobao", label: "Taobao" },
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
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About ATG Mall" },
      { href: "/contact", label: "Contact us" },
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

export function Footer() {
  return (
    <footer className="bg-navy-900 text-navy-200">
      <div className="container-atg grid grid-cols-2 gap-10 py-14 sm:grid-cols-3 lg:grid-cols-6">
        <div className="col-span-2 lg:col-span-2">
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-navy-300">
            Shop products from China and get them delivered to Nigeria or Gambia. We handle
            sourcing, purchasing, receiving, consolidation and international shipping.
          </p>
          <div className="mt-5 space-y-1 text-sm text-navy-300">
            <p>WhatsApp/Call: <a href="tel:+2347043945345" className="hover:text-white">+234 704 394 5345</a></p>
            <p>Email: <a href="mailto:support@apexterraglobal.com" className="hover:text-white">support@apexterraglobal.com</a></p>
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-navy-400">{col.title}</h3>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-navy-300 hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
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
