import Link from "next/link";
import Image from "next/image";
import type { Currency } from "@prisma/client";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/Badge";
import { StarRating } from "./StarRating";

export interface ProductCardData {
  slug: string;
  name: string;
  imageUrl: string | null;
  avgRating: number;
  reviewCount: number;
  isWholesale: boolean;
  isFeatured: boolean;
  moq: number;
  estimatedLandedMinor: number;
  currency: Currency;
}

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link href={`/product/${product.slug}`} className="card group flex flex-col overflow-hidden">
      <div className="relative aspect-square w-full overflow-hidden bg-sand-100">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-navy-200">No image</div>
        )}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.isFeatured && <Badge tone="gold">Trending</Badge>}
          {product.isWholesale && <Badge tone="blue">Wholesale</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-navy-900">{product.name}</h3>
        <StarRating rating={product.avgRating} reviewCount={product.reviewCount} size="sm" />
        <div className="mt-auto pt-2">
          <p className="text-[11px] uppercase tracking-wide text-navy-400">Est. landed cost from</p>
          <p className="text-lg font-display font-bold text-navy-900">
            {formatMoney(product.estimatedLandedMinor, product.currency)}
          </p>
          {product.moq > 1 && <p className="text-[11px] text-navy-400">MOQ: {product.moq} pcs</p>}
        </div>
      </div>
    </Link>
  );
}
