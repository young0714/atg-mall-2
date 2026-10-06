import "server-only";
import { db } from "@/lib/db";
import { collectRelated } from "@/lib/relatedProducts";
import { collectDescendantIds } from "@/lib/categoryTree";
import type { Prisma, Product, ProductImage } from "@prisma/client";

type ProductWithImage = Product & { images: ProductImage[] };

// Same rule the shop uses for "live", plus: never advertise something with every option sold out.
const BUYABLE: Prisma.ProductWhereInput = {
  isActive: true,
  OR: [{ variants: { none: {} } }, { variants: { some: { stock: { gt: 0 } } } }],
};

// Trending first, then best-liked, then newest. Stable, so the same product always shows the same row.
const BEST_FIRST: Prisma.ProductOrderByWithRelationInput[] = [{ isFeatured: "desc" }, { avgRating: "desc" }, { reviewCount: "desc" }, { createdAt: "desc" }];

/**
 * Products similar to this one: same category first (including its sub-categories),
 * then the parent category's other branches, then the best-liked products overall,
 * so the row is full whenever the shop has enough products.
 */
export async function getRelatedProducts(product: { id: string; categoryId: string }, limit = 8): Promise<ProductWithImage[]> {
  const categories = await db.category.findMany({ select: { id: true, parentId: true } });
  const own = categories.find((c) => c.id === product.categoryId);
  const sameCategoryIds = collectDescendantIds(categories, product.categoryId);
  const nearbyIds = own?.parentId ? collectDescendantIds(categories, own.parentId).filter((id) => !sameCategoryIds.includes(id)) : [];

  const tier = (categoryIds: string[] | null) => async (excludeIds: string[], need: number) => {
    if (categoryIds !== null && categoryIds.length === 0) return [];
    return db.product.findMany({
      where: { ...BUYABLE, id: { notIn: excludeIds }, ...(categoryIds ? { categoryId: { in: categoryIds } } : {}) },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      orderBy: BEST_FIRST,
      take: need,
    });
  };

  return collectRelated<ProductWithImage>(limit, [tier(sameCategoryIds), tier(nearbyIds), tier(null)], [product.id]);
}
