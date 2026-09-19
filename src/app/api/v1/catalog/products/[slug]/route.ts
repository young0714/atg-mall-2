import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const product = await db.product.findUnique({
    where: { slug: params.slug },
    include: { images: true, variants: true, supplier: true, category: true },
  });

  if (!product || !product.isActive) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      category: { name: product.category.name, slug: product.category.slug },
      images: product.images.map((i) => i.url),
      variants: product.variants.map((v) => ({ id: v.id, name: v.name, attributes: v.attributes, priceDeltaMinor: v.priceDeltaMinor })),
      supplier: product.supplier ? { name: product.supplier.name, location: product.supplier.location, verified: product.supplier.verified } : null,
      basePriceMinor: product.basePriceMinor,
      baseCurrency: product.baseCurrency,
      moq: product.moq,
      weightGrams: product.weightGrams,
    },
  });
}
