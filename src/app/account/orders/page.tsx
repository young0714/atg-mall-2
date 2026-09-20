import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { getDestination } from "@/lib/destination";
import { toProductCard } from "@/lib/product-view";
import { currencyConversionService } from "@/lib/services/currencyConversionService";
import { StatusBadge } from "@/components/ui/Badge";
import { ProductCard } from "@/components/shop/ProductCard";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { addWalletUpsellAction } from "./actions";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { justPlaced?: string; paymentError?: string; added?: string };
}) {
  const user = await requireUser();
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  // Only surface a "you might also like" nudge right after a clean
  // success — not on the payment-retry banner, where the customer's
  // attention should stay on fixing that order.
  const showTrending = Boolean(searchParams.justPlaced) && !searchParams.paymentError;
  let trendingCards: Awaited<ReturnType<typeof toProductCard>>[] = [];

  // Post-purchase upsell — Wallet orders only for now, see actions.ts. Picks
  // one other active product from the same category as something just
  // bought; instant, no repayment, since Wallet is the one payment method
  // that can genuinely support that (Card/Bank Transfer go through a
  // separate gateway redirect, which isn't a real one-click flow — see the
  // discussion in feedback/project memory before extending this to them).
  let upsellOrder: { id: string; orderNumber: string; currency: (typeof orders)[number]["currency"] } | null = null;
  let upsellProduct: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    priceMinor: number;
    currency: (typeof orders)[number]["currency"];
  } | null = null;

  if (showTrending) {
    const destination = await getDestination();

    const [trendingProducts, justPlacedOrder] = await Promise.all([
      db.product.findMany({
        where: { isActive: true, isFeatured: true },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
        take: 4,
        orderBy: { createdAt: "desc" },
      }),
      db.order.findFirst({
        where: { userId: user.id, orderNumber: searchParams.justPlaced },
        include: {
          items: { select: { productId: true, product: { select: { categoryId: true } } } },
          payments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      }),
    ]);
    trendingCards = await Promise.all(trendingProducts.map((p) => toProductCard(p, destination)));

    const wasWalletPayment = justPlacedOrder?.payments[0]?.method === "WALLET" && justPlacedOrder.payments[0]?.status === "SUCCESSFUL";
    if (justPlacedOrder && wasWalletPayment) {
      const orderedProductIds = justPlacedOrder.items.map((i) => i.productId).filter((id): id is string => !!id);
      const categoryIds = [...new Set(justPlacedOrder.items.map((i) => i.product?.categoryId).filter((id): id is string => !!id))];

      const candidate = categoryIds.length
        ? await db.product.findFirst({
            where: { isActive: true, categoryId: { in: categoryIds }, id: { notIn: orderedProductIds } },
            include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
            orderBy: { createdAt: "desc" },
          })
        : null;

      if (candidate) {
        upsellOrder = { id: justPlacedOrder.id, orderNumber: justPlacedOrder.orderNumber, currency: justPlacedOrder.currency };
        upsellProduct = {
          id: candidate.id,
          name: candidate.name,
          slug: candidate.slug,
          imageUrl: candidate.images[0]?.url ?? null,
          priceMinor: currencyConversionService.convert(candidate.basePriceMinor, candidate.baseCurrency, justPlacedOrder.currency),
          currency: justPlacedOrder.currency,
        };
      }
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-navy-900">My Orders</h1>

      {searchParams.added && (
        <div className="mt-4 rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Added to your order!</div>
      )}
      {searchParams.justPlaced && !searchParams.paymentError && (
        <div className="mt-4 rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">
          Order <strong>{searchParams.justPlaced}</strong> placed successfully!
        </div>
      )}
      {searchParams.justPlaced && searchParams.paymentError && (
        <div className="mt-4 rounded-lg bg-gold-50 p-3 text-sm text-gold-700">
          Order <strong>{searchParams.justPlaced}</strong> was created, but payment didn&apos;t go through:{" "}
          {searchParams.paymentError} Open the order below to retry payment.
        </div>
      )}

      {upsellProduct && upsellOrder && (
        <div className="mt-4 overflow-hidden rounded-xl2 border border-navy-100">
          <div className="flex items-center justify-between px-4 pb-2 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gold-600">Often added together</p>
            <span className="rounded-full bg-atggreen-50 px-2 py-0.5 text-[11px] font-bold text-atggreen-700">Instant · Wallet</span>
          </div>
          <div className="flex gap-3 px-4 pb-3">
            {upsellProduct.imageUrl && (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-sand-100">
                <Image src={upsellProduct.imageUrl} alt={upsellProduct.name} fill className="object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-navy-800">{upsellProduct.name}</p>
              <p className="mt-1 text-sm font-bold text-navy-900">{formatMoney(upsellProduct.priceMinor, upsellProduct.currency)}</p>
            </div>
          </div>
          <form action={addWalletUpsellAction} className="px-4 pb-4">
            <input type="hidden" name="orderId" value={upsellOrder.id} />
            <input type="hidden" name="productId" value={upsellProduct.id} />
            <button type="submit" className="btn-primary w-full">
              Add to my order — {formatMoney(upsellProduct.priceMinor, upsellProduct.currency)}
            </button>
            <p className="mt-2 text-center text-[11px] text-navy-400">Charged instantly from your ATG Wallet. No new payment step.</p>
          </form>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="mt-8 rounded-xl2 border border-dashed border-navy-200 p-12 text-center">
          <p className="text-navy-500">You haven&apos;t placed any orders yet.</p>
          <Link href="/shop" className="btn-primary mt-4 inline-flex">Start shopping</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/account/orders/${order.id}`} className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-semibold text-navy-800">{order.orderNumber}</p>
                <p className="text-xs text-navy-400">
                  {formatDate(order.createdAt)} · {order.items.length} item{order.items.length === 1 ? "" : "s"} · {order.source.replaceAll("_", " ")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-medium text-navy-700">{formatMoney(order.totalMinor, order.currency)}</span>
                <StatusBadge status={order.status} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {trendingCards.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-display font-bold text-navy-900">You might also like</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {trendingCards.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
