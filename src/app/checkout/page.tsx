import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { shippingService } from "@/lib/services/shippingService";
import { currencyConversionService } from "@/lib/services/currencyConversionService";
import { formatMoney } from "@/lib/money";
import { SHIPPING_METHOD_LABELS } from "@/lib/constants";
import { Container, Section } from "@/components/ui/Section";
import { Field, Input, Select } from "@/components/ui/Form";
import { addAddressAction, placeOrderAction } from "./actions";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ShippingMethod } from "@prisma/client";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await requireUser();

  const [cart, addresses, profile] = await Promise.all([
    db.cart.findUnique({ where: { userId: user.id }, include: { items: { include: { product: true } } } }),
    db.address.findMany({ where: { userId: user.id }, orderBy: { isDefault: "desc" } }),
    db.customerProfile.findUnique({ where: { userId: user.id } }),
  ]);

  if (!cart || cart.items.length === 0) redirect("/cart");

  const wallet = await db.wallet.findUnique({ where: { userId: user.id } });

  const totalWeightGrams = cart.items.reduce((sum, i) => sum + i.product.weightGrams * i.quantity, 0);
  const subtotalCny = cart.items.reduce(
    (sum, i) => sum + i.product.basePriceMinor * i.quantity,
    0,
  );
  const destinationCountry = profile?.country ?? addresses[0]?.country ?? "NIGERIA";
  const orderCurrency = profile?.preferredCurrency ?? (destinationCountry === "NIGERIA" ? "NGN" : "GMD");
  const subtotalMinor = currencyConversionService.convert(subtotalCny, "CNY", orderCurrency);
  const serviceFeeMinor = Math.round(subtotalMinor * 0.05);

  const methods: ShippingMethod[] = ["AIR_FREIGHT", "SEA_FREIGHT", "COURIER"];
  const quotes = await Promise.all(
    methods.map(async (method) => ({
      method,
      quote: await shippingService.getQuote({ destinationCountry, method, weightGrams: totalWeightGrams }),
    })),
  );

  return (
    <Section className="!py-10">
      <Container className="max-w-3xl">
        <h1 className="text-2xl font-display font-bold text-navy-900">Checkout</h1>

        {searchParams.error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
        )}

        <div className="mt-8 space-y-8">
          <section className="card p-5">
            <h2 className="font-semibold text-navy-900">Delivery Address</h2>
            {addresses.length === 0 ? (
              <p className="mt-2 text-sm text-navy-500">Add a delivery address to continue.</p>
            ) : null}

            <form action={addAddressAction} className="mt-4 grid gap-3 rounded-xl2 border border-dashed border-navy-200 p-4 sm:grid-cols-2">
              <input type="hidden" name="label" value="Home" />
              <Field label="Full name" htmlFor="fullName" required>
                <Input id="fullName" name="fullName" required />
              </Field>
              <Field label="Phone" htmlFor="phone" required>
                <Input id="phone" name="phone" required />
              </Field>
              <Field label="Country" htmlFor="country" required>
                <Select id="country" name="country" defaultValue={destinationCountry} required>
                  <option value="NIGERIA">Nigeria</option>
                  <option value="GAMBIA">Gambia</option>
                </Select>
              </Field>
              <Field label="State/Region" htmlFor="state" required>
                <Input id="state" name="state" required />
              </Field>
              <Field label="City" htmlFor="city" required>
                <Input id="city" name="city" required />
              </Field>
              <Field label="Address" htmlFor="addressLine1" required>
                <Input id="addressLine1" name="addressLine1" required />
              </Field>
              <div className="sm:col-span-2">
                <button type="submit" className="btn-outline btn-sm">Save new address</button>
              </div>
            </form>
          </section>

          <form action={placeOrderAction} className="space-y-8">
            {addresses.length > 0 && (
              <section className="card p-5">
                <h2 className="mb-3 font-semibold text-navy-900">Choose Address</h2>
                <div className="space-y-2">
                  {addresses.map((a) => (
                    <label key={a.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-navy-100 p-3 has-[:checked]:border-atgblue-400 has-[:checked]:bg-atgblue-50">
                      <input type="radio" name="addressId" value={a.id} defaultChecked={a.isDefault} className="mt-1" required />
                      <span className="text-sm">
                        <span className="font-medium text-navy-800">{a.fullName}</span> — {a.addressLine1}, {a.city}, {a.state}, {a.country === "NIGERIA" ? "Nigeria" : "Gambia"}
                        <br />
                        <span className="text-navy-400">{a.phone}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            <section className="card p-5">
              <h2 className="mb-3 font-semibold text-navy-900">Shipping Method</h2>
              <div className="space-y-2">
                {quotes.map(({ method, quote }) => (
                  <label key={method} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-navy-100 p-3 has-[:checked]:border-atgblue-400 has-[:checked]:bg-atgblue-50">
                    <span className="flex items-center gap-3 text-sm">
                      <input type="radio" name="shippingMethod" value={method} defaultChecked={method === "AIR_FREIGHT"} required />
                      <span>
                        <span className="font-medium text-navy-800">{SHIPPING_METHOD_LABELS[method]}</span>
                        {quote && <span className="block text-xs text-navy-400">{quote.estimatedDaysMin}–{quote.estimatedDaysMax} days</span>}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-navy-800">
                      {quote ? formatMoney(quote.estimatedCostMinor, quote.currency) : "Not available"}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="card p-5">
              <h2 className="mb-3 font-semibold text-navy-900">Payment Method</h2>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-3 rounded-lg border border-navy-100 p-3 has-[:checked]:border-atgblue-400 has-[:checked]:bg-atgblue-50">
                  <input type="radio" name="paymentMethod" value="WALLET" defaultChecked required />
                  ATG Wallet {wallet && <span className="text-navy-400">— balance {formatMoney(wallet.balanceMinor, wallet.currency)}</span>}
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-navy-100 p-3 has-[:checked]:border-atgblue-400 has-[:checked]:bg-atgblue-50">
                  <input type="radio" name="paymentMethod" value="CARD" />
                  Debit/Credit Card (mock payment — no real gateway connected yet)
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-navy-100 p-3 has-[:checked]:border-atgblue-400 has-[:checked]:bg-atgblue-50">
                  <input type="radio" name="paymentMethod" value="BANK_TRANSFER" />
                  Bank Transfer (mock payment — no real gateway connected yet)
                </label>
              </div>
            </section>

            <section className="card p-5">
              <h2 className="mb-3 font-semibold text-navy-900">Order Summary</h2>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-navy-500">Subtotal</dt><dd>{formatMoney(subtotalMinor, orderCurrency)}</dd></div>
                <div className="flex justify-between"><dt className="text-navy-500">Service fee (5%)</dt><dd>{formatMoney(serviceFeeMinor, orderCurrency)}</dd></div>
                <div className="flex justify-between"><dt className="text-navy-500">Shipping</dt><dd>Selected above</dd></div>
              </dl>
              <p className="mt-3 text-xs text-navy-400">
                Final total is calculated when your order is placed, based on the shipping method you select.
              </p>
              <button type="submit" className="btn-primary mt-4 w-full" disabled={addresses.length === 0}>
                Place Order
              </button>
            </section>
          </form>
        </div>
      </Container>
    </Section>
  );
}
