import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/Badge";
import type { RemoteProductSummary } from "@/lib/services/types";

export function RemoteListingGrid({ items }: { items: RemoteProductSummary[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">
        No listings match your search.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const params = new URLSearchParams({
          productUrl: item.sourceUrl,
          productName: item.title,
          productImageUrl: item.imageUrl,
        });
        return (
          <div key={item.externalId} className="card flex flex-col overflow-hidden">
            <div className="relative aspect-square bg-sand-100">
              <Image src={item.imageUrl} alt={item.title} fill sizes="240px" className="object-cover" />
              <Badge tone="neutral" className="absolute left-2 top-2 bg-white/90">
                {item.platform === "MOCK_1688" ? "1688" : "Taobao"}
              </Badge>
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-4">
              <h3 className="line-clamp-2 text-sm font-semibold text-navy-900">{item.title}</h3>
              <p className="text-xs text-navy-400">{item.supplierName} · {item.supplierLocation}</p>
              <p className="mt-1 text-base font-display font-bold text-navy-900">
                {formatMoney(item.priceMinor, item.currency)}
                <span className="text-xs font-normal text-navy-400"> / unit</span>
              </p>
              {item.moq > 1 && <p className="text-[11px] text-navy-400">MOQ: {item.moq} pcs</p>}
              <Link href={`/shop-for-me?${params.toString()}`} className="btn-primary btn-sm mt-auto">
                Request this item
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
