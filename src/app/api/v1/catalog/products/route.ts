import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/catalog/products?q=&category=&wholesale=&page=&pageSize=
 * Public product listing — the same query the web catalog page uses,
 * exposed as JSON so a future mobile client can consume it directly.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const wholesale = searchParams.get("wholesale") === "1";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Number(searchParams.get("pageSize") ?? 20));

  const where: Prisma.ProductWhereInput = { isActive: true };
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }];
  if (category) where.category = { slug: category };
  if (wholesale) where.isWholesale = true;

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, category: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.product.count({ where }),
  ]);

  return NextResponse.json({
    data: products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category.name,
      imageUrl: p.images[0]?.url ?? null,
      basePriceMinor: p.basePriceMinor,
      baseCurrency: p.baseCurrency,
      moq: p.moq,
      isWholesale: p.isWholesale,
      isFeatured: p.isFeatured,
      avgRating: p.avgRating,
      reviewCount: p.reviewCount,
    })),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
