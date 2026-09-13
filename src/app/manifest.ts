import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ATG Mall — Shop The World. Delivered To You.",
    short_name: "ATG Mall",
    description:
      "Shop products from China, the USA and the UK, delivered to supported destinations worldwide. Sourcing, purchasing, warehousing, consolidation and shipping — handled by ATG Mall.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f2038",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
