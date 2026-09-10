import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { getDestination } from "@/lib/destination";
import { formatMoney } from "@/lib/money";
import { Container, Section } from "@/components/ui/Section";
import Link from "next/link";
import Image from "next/image";
import { updateCartItemAction, removeCartItemAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Your Cart" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const user = await requireUser();
  const destination = getDestination();

  const cart = await db.cart.findUnique({
    where: { userId: user.id },
    include: { items: { include: { product: { include: { images: { take: 1 } } }, variant: true } } },
  });

  const items = cart?.items ?? [];
  const subtotalMinor = items.reduce(
    (sum, item) => sum + (item.product.basePriceMinor + (item.variant?.priceDeltaMinor ?? 0)) * item.quantity,
    0,
  );

  return (
    <Section className="!py-10">
      <Container className="max-w-4xl">
        <h1 className="text-2xl font-display font-bold text-navy-900">Your Cart</h1>

        {items.length === 0 ? (
          <div className="mt-8 rounded-xl2 border border-dashed border-navy-200 p-12 text-center">
            <p className="text-navy-500">Your cart is empty.</p>
            <Link href="/shop" className="btn-primary mt-4 inline-flex">Continue shopping</Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              {items.map((item) => {
                const unitPrice = item.product.basePriceMinor + (item.variant?.priceDeltaMinor ?? 0);
                return (
                  <div key={item.id} className="card flex gap-4 p-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-sand-100">
                      {item.product.images[0] && (
                        <Image src={item.product.images[0].url} alt={item.product.name} fill className="object-cover" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col">
                      <Link href={`/product/${item.product.slug}`} className="text-sm font-semibold text-navy-900 hover:text-atgblue-600">
                        {item.product.name}
                      </Link>
                      {item.variant && <p className="text-xs text-navy-400">{item.variant.name}</p>}
                      <p className="mt-1 text-sm font-medium text-navy-700">
                        {formatMoney(unitPrice, item.product.baseCurrency)} × {item.quantity}
                      </p>
                      <div className="mt-auto flex items-center gap-3 pt-2">
                        <form action={updateCartItemAction} className="flex items-center gap-2">
                          <input type="hidden" name="itemId" value={item.id} />
                          <input
                            type="number"
                            name="quantity"
                            defaultValue={item.quantity}
                            min={1}
                            className="input w-16 !py-1 text-sm"
                          />
                          <button type="submit" className="btn-outline btn-sm">Update</button>
                        </form>
                        <form action={removeCartItemAction}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                            Remove
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card h-fit p-5">
              <h2 className="font-semibold text-navy-900">Order Summary</h2>
              <div className="mt-3 flex justify-between text-sm">
                <span className="text-navy-500">Subtotal (product cost)</span>
                <span className="font-medium text-navy-800">{formatMoney(subtotalMinor, "CNY")}</span>
              </div>
              <p className="mt-2 text-xs text-navy-400">
                Shipping, service fee and final total in {destination.currency} are calculated at checkout.
              </p>
              <Link href="/checkout" className="btn-primary mt-4 w-full">
                Proceed to Checkout
              </Link>
            </div>
          </div>
        )}
      </Container>
    </Section>
  );
}
