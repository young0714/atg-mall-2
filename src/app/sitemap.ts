import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Static, publicly-crawlable marketing/legal routes. Account, admin, cart,
// checkout and API routes are intentionally excluded — they're either
// private (behind auth) or not useful for search engines to index.
const staticRoutes = [
  "",
  "/shop",
  "/shop-from-china",
  "/shop-from-china/1688",
  "/shop-from-china/taobao",
  "/shop-for-me",
  "/source-a-product",
  "/track",
  "/support",
  "/about",
  "/contact",
  "/login",
  "/register",
  "/legal/terms",
  "/legal/privacy",
  "/legal/refund-policy",
  "/legal/shipping-policy",
  "/legal/prohibited-items",
  "/legal/seller-terms",
  "/legal/customer-agreement",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${appUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.6,
  }));

  // Best-effort: include active product pages too. If the database isn't
  // reachable at build time, fall back to the static routes only rather
  // than failing the whole sitemap.
  try {
    const products = await db.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
      take: 5000,
    });
    for (const p of products) {
      entries.push({
        url: `${appUrl}/product/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // Database unavailable — sitemap still returns the static routes above.
  }

  return entries;
}
