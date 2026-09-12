/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.apexterraglobal.com" },
      // CJdropshipping's product image CDNs — used by imported CJDROPSHIPPING products.
      { protocol: "https", hostname: "**.cjdropshipping.com" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
