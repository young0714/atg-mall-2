/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.apexterraglobal.com" },
      // CJdropshipping's product image CDNs — used by imported CJDROPSHIPPING products.
      { protocol: "https", hostname: "**.cjdropshipping.com" },
      // AliExpress's product image CDN — used by imported ALIEXPRESS products.
      { protocol: "https", hostname: "**.alicdn.com" },
      // Matterhorn Wholesale's product image host — used by imported MATTERHORN products.
      { protocol: "https", hostname: "matterhorn-wholesale.com" },
      // Vercel Blob (admin-uploaded product images/videos) — store subdomain is generated per-project.
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
