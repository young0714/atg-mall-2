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
    default: "ATG Mall — Shop The World. Delivered To You.",
    template: "%s | ATG Mall",
  },
  description:
    "ATG Mall is a worldwide shopping marketplace — shop products from China, the USA and the UK, with sourcing, warehousing, consolidation and international shipping handled end to end. Delivery available to supported destinations worldwide, including Nigeria and Gambia.",
  keywords: [
    "worldwide shopping marketplace",
    "international shopping marketplace",
    "cross-border shopping worldwide",
    "buy from China worldwide",
    "shop from China worldwide",
    "shop from USA worldwide",
    "shop from UK worldwide",
    "China shipping worldwide",
    "China sourcing worldwide",
    "1688 worldwide",
    "shop from China Nigeria",
    "shop from China Gambia",
    "buy from USA Nigeria",
    "buy from UK Nigeria",
  ],
  openGraph: {
    title: "ATG Mall — Shop The World. Delivered To You.",
    description:
      "Shop products from China, the USA and the UK, delivered to supported destinations worldwide. Sourcing, purchasing, warehousing, consolidation and shipping — handled by ATG Mall.",
    url: appUrl,
    siteName: "ATG Mall",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ATG Mall — Shop The World. Delivered To You.",
    description: "Shop from China, USA and UK. We handle the rest. Cross-border shopping, worldwide.",
  },
  alternates: { canonical: appUrl },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ATG Mall",
  url: appUrl,
  description:
    "ATG Mall is a worldwide cross-border shopping and logistics platform connecting customers to suppliers and stores in China, the USA and the UK.",
  parentOrganization: {
    "@type": "Organization",
    name: "Apex Terra Global Limited",
    url: "https://apexterraglobal.com",
  },
  areaServed: "Worldwide",
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
