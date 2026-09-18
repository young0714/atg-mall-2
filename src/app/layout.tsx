import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { InstallAppBanner } from "@/components/pwa/InstallAppBanner";
import { AppLockGate } from "@/components/account/AppLockGate";
import { getCurrentUser } from "@/lib/auth/current-user";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

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
    images: [{ url: "/logo.png", width: 1254, height: 1254, alt: "ATG Mall" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ATG Mall — Shop The World. Delivered To You.",
    description: "Shop from China, USA and UK. We handle the rest. Cross-border shopping, worldwide.",
    images: ["/logo.png"],
  },
  alternates: { canonical: appUrl },
  appleWebApp: {
    capable: true,
    title: "ATG Mall",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f2038",
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const pinLockActive = !!user?.pinEnabled;

  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className="flex min-h-screen flex-col font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {gaMeasurementId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}');
              `}
            </Script>
          </>
        )}
        <ServiceWorkerRegister />
        <AppLockGate active={pinLockActive}>
          <InstallAppBanner />
          <Header />
          <main className="flex-1 pb-16 lg:pb-0">{children}</main>
          <Footer />
          <MobileNav />
        </AppLockGate>
      </body>
    </html>
  );
}
