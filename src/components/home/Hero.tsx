import Link from "next/link";
import { DestinationSwitcher } from "@/components/layout/DestinationSwitcher";
import type { Country } from "@prisma/client";

export function Hero({ destination }: { destination: Country }) {
  return (
    <section className="relative overflow-hidden bg-navy-gradient text-white">
      <div className="absolute inset-0 opacity-20" aria-hidden>
        <svg width="100%" height="100%" viewBox="0 0 800 500" preserveAspectRatio="none">
          <path d="M0 400 C 200 300, 300 450, 500 350 S 800 250, 800 250" stroke="white" strokeWidth="1.5" fill="none" />
          <path d="M0 300 C 200 200, 300 350, 500 250 S 800 150, 800 150" stroke="white" strokeWidth="1" fill="none" />
        </svg>
      </div>
      <div className="container-atg relative flex flex-col gap-10 py-16 sm:py-24 lg:flex-row lg:items-center">
        <div className="max-w-xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gold-300">
            Nigeria &amp; Gambia's cross-border shopping platform
          </p>
          <h1 className="text-4xl font-display font-extrabold leading-tight sm:text-5xl">
            Shop Global.<br />
            <span className="text-atgblue-300">Delivered Local.</span>
          </h1>
          <p className="mt-5 max-w-lg text-navy-100">
            Shop products from China and get them delivered to Nigeria or Gambia. We handle
            sourcing, purchasing, receiving, consolidation and international shipping — so you
            don&apos;t have to.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/shop-from-china" className="btn-gold">
              Shop From China
            </Link>
            <Link href="/source-a-product" className="btn bg-white/10 text-white hover:bg-white/20">
              Source A Product
            </Link>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-navy-300">Deliver to</span>
            <DestinationSwitcher current={destination} variant="dark" />
          </div>
        </div>

        <div className="flex-1">
          <div className="mx-auto grid max-w-md grid-cols-2 gap-3 sm:gap-4">
            {[
              { label: "Sourcing", desc: "1688 · Taobao · suppliers", icon: "🔎" },
              { label: "Warehousing", desc: "China consolidation hub", icon: "🏭" },
              { label: "Shipping", desc: "Air · Sea · Courier", icon: "✈️" },
              { label: "Delivery", desc: "Nigeria & Gambia", icon: "📦" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl2 bg-white/10 p-4 backdrop-blur-sm">
                <div className="text-2xl">{item.icon}</div>
                <p className="mt-2 text-sm font-semibold text-white">{item.label}</p>
                <p className="text-xs text-navy-200">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
