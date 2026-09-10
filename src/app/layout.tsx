import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "ATG Mall — Shop Global. Delivered Local.",
    template: "%s | ATG Mall",
  },
  description:
    "ATG Mall helps customers in Nigeria and Gambia shop, source and buy products from China — 1688, Taobao and trusted suppliers — with sourcing, warehousing, consolidation and international shipping handled end to end.",
  keywords: [
    "buy from China Nigeria",
    "1688 Nigeria",
    "shop from China Nigeria",
    "China shipping Nigeria",
    "China sourcing Nigeria",
    "buy from China Gambia",
    "China shipping Gambia",
    "1688 Gambia",
    "product sourcing Nigeria",
    "product sourcing Gambia",
  ],
  openGraph: {
    title: "ATG Mall — Shop Global. Delivered Local.",
    description:
      "Shop products from China and get them delivered to Nigeria or Gambia. Sourcing, purchasing, warehousing, consolidation and shipping — handled by ATG Mall.",
    url: appUrl,
    siteName: "ATG Mall",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ATG Mall — Shop Global. Delivered Local.",
    description: "Shop from China. We handle the rest. Cross-border shopping for Nigeria & Gambia.",
  },
  alternates: { canonical: appUrl },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ATG Mall",
  url: appUrl,
  description:
    "ATG Mall is a cross-border shopping and logistics platform connecting customers in Nigeria and Gambia to suppliers in China.",
  parentOrganization: {
    "@type": "Organization",
    name: "Apex Terra Global Limited",
    url: "https://apexterraglobal.com",
  },
  areaServed: ["NG", "GM"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className="flex min-h-screen flex-col font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <Header />
        <main className="flex-1 pb-16 lg:pb-0">{children}</main>
        <Footer />
        <MobileNav />
      </body>
    </html>
  );
}
