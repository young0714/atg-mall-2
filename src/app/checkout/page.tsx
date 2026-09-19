import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { currencyConversionService } from "@/lib/services/currencyConversionService";
import { groupCartForShipping } from "@/lib/services/shipping/cartShipmentGrouping";
import { customsService } from "@/lib/services/shipping/customsService";
import { currencyForDestinationIso, getActiveDestinationCountries, destinationCountryNameFor } from "@/lib/services/destinationCountryService";
import { isoToFlagEmoji } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import { Container, Section } from "@/components/ui/Section";
import { Field, Input, Select } from "@/components/ui/Form";
import { paymentService } from "@/lib/services/paymentService";
import { addAddressAction, initiateCheckoutOtpAction } from "./actions";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CheckoutShippingSummary } from "@/components/checkout/CheckoutShippingSummary";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  // Browsing and adding to cart never require an account — checkout is
  // the one point a real identity is needed (address, order history,
  // wallet), so this is where we send anonymous visitors to sign in,
  // register, or continue as a guest, then bring them right back here.
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");

  const [cart, addresses, profile, countries] = await Promise.all([
    db.cart.findUnique({ where: { userId: user.id }, include: { items: { include: { product: true, variant: true } } } }),
    db.address.findMany({ where: { userId: user.id }, orderBy: { isDefault: "desc" } }),
    db.customerProfile.findUnique({ where: { userId: user.id } }),
    getActiveDestinationCountries(),
  ]);

  if (!cart || cart.items.length === 0) redirect("/cart");

  const wallet = await db.wallet.findUnique({ where: { userId: user.id } });

  const destinationIso = profile?.countryIso ?? addresses[0]?.countryIso ?? "NG";
  const orderCurrency = profile?.preferredCurrency ?? currencyForDestinationIso(destinationIso);

  // Convert each item from its OWN base currency (CNY, USD, etc.) — not
  // hardcoded as if every product were CNY-priced.
  const subtotalMinor = cart.items.reduce(
    (sum, i) =>
      sum +
      currencyConversionService.convert(i.product.basePriceMinor + (i.variant?.priceDeltaMinor ?? 0), i.product.baseCurrency, orderCurrency) *
        i.quantity,
    0,
  );
  const serviceFeeMinor = Math.round(subtotalMinor * 0.01);

  const { groups, unresolvedLines } = await groupCartForShipping(
    cart.items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
      weightGrams: i.product.weightGrams,
      shippingOriginId: i.product.shippingOriginId,
      sourcePlatform: i.product.sourcePlatform,
    })),
    destinationIso,
    orderCurrency,
  );

  const customs = await customsService.getDisclosure(destinationIso);

  // Addresses can reference a country that's since been deactivated (still
  // valid historical data), so resolve names from the full reference table,
  // not just the active `countries` list used for the select options.
  const addressCountryNames = new Map(
    await Promise.all(addresses.map(async (a) => [a.countryIso, await destinationCountryNameFor(a.countryIso)] as const)),
  );

  const blockedGroups = groups.filter((g) => g.quote.options.length === 0);
  const canCheckout = unresolvedLines.length === 0 && blockedGroups.length === 0 && addresses.length > 0;

  const cheapestByOrigin = new Map(
    groups.map((g) => [
      g.shippingOriginId,
      g.quote.options.reduce<(typeof g.quote.options)[number] | null>(
        (best, o) => (!best || o.displayCustomerPriceMinor < best.displayCustomerPriceMinor ? o : best),
        null,
      ),
    ]),
  );

  const itemsByKey = new Map(cart.items.map((i) => [`${i.productId}_${i.variantId ?? ""}`, i]));

  // Plain-serializable shape for the client component — Prisma line-item
  // objects (Dates, Decimal, etc.) can't cross the server/client boundary.
  const shippingGroupsForClient = groups.map((g) => ({
    shippingOriginId: g.shippingOriginId,
    originName: g.originName,
    totalWeightGrams: g.totalWeightGrams,
    itemsLabel: g.lines
      .map((l) => itemsByKey.get(`${l.productId}_${l.variantId ?? ""}`))
      .filter((i): i is NonNullable<typeof i> => Boolean(i))
      .map((i) => `${i.product.name} × ${i.quantity}`)
      .join(", "),
    unavailableReason: g.quote.unavailableReason ?? null,
    options: g.quote.options.map((o) => ({
      serviceLevelId: o.serviceLevelId,
      serviceLevelName: o.serviceLevelName,
      carrierName: o.carrierName,
      estimatedDeliveryDaysMin: o.estimatedDeliveryDaysMin,
      estimatedDeliveryDaysMax: o.estimatedDeliveryDaysMax,
      trackingAvailable: o.trackingAvailable,
      displayCustomerPriceMinor: o.displayCustomerPriceMinor,
      displayCurrency: o.displayCurrency,
    })),
    defaultServiceLevelId: cheapestByOrigin.get(g.shippingOriginId)?.serviceLevelId ?? null,
  }));

  return (
    <Section className="!py-10">
      <Container className="max-w-3xl">
        <h1 className="text-2xl font-display font-bold text-navy-900">Checkout</h1>

        {searchParams.error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
        )}
        {unresolvedLines.length > 0 && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            Some items in your cart don&apos;t have shipping information configured yet. Please contact support before
            checking out.
          </div>
        )}

        <div className="mt-8 space-y-8">
          <section className="card p-5">
            <h2 className="font-semibold text-navy-900">Delivery Address</h2>
            {addresses.length === 0 ? (
              <p className="mt-2 text-sm text-navy-500">Add a delivery address to continue.</p>
            ) : null}

            <form action={addAddressAction} className="mt-4 grid grid-cols-1 gap-3 rounded-xl2 border border-dashed border-navy-200 p-4 sm:grid-cols-2">
              <input type="hidden" name="label" value="Home" />
              <Field label="Full name" htmlFor="fullName" required>
                <Input id="fullName" name="fullName" required />
              </Field>
              <Field label="Phone" htmlFor="phone" required>
                <Input id="phone" name="phone" required />
              </Field>
              <Field label="Country" htmlFor="countryIso" required>
                <Select id="countryIso" name="countryIso" defaultValue={destinationIso} required>
                  {countries.map((c) => (
                    <option key={c.isoCode} value={c.isoCode}>{isoToFlagEmoji(c.isoCode)} {c.name}</option>
                  ))}
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
                <SubmitButton className="btn-outline btn-sm">Save new address</SubmitButton>
              </div>
            </form>
          </section>

          <form action={initiateCheckoutOtpAction} className="space-y-8">
            {addresses.length > 0 && (
              <section className="card p-5">
                <h2 className="mb-3 font-semibold text-navy-900">Choose Address</h2>
                <div className="space-y-2">
                  {addresses.map((a) => (
                    <label key={a.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-navy-100 p-3 has-[:checked]:border-atgblue-400 has-[:checked]:bg-atgblue-50">
                      <input type="radio" name="addressId" value={a.id} defaultChecked={a.isDefault} className="mt-1" required />
                      <span className="text-sm">
                        <span className="font-medium text-navy-800">{a.fullName}</span> — {a.addressLine1}, {a.city}, {a.state}, {addressCountryNames.get(a.countryIso) ?? a.countryIso}
                        <br />
                        <span className="text-navy-400">{a.phone}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            <CheckoutShippingSummary
              groups={shippingGroupsForClient}
              subtotalMinor={subtotalMinor}
              serviceFeeMinor={serviceFeeMinor}
              orderCurrency={orderCurrency}
              customsDisclaimer={customs.disclaimer}
              canCheckout={canCheckout}
            >
              <section className="card p-5">
                <h2 className="mb-3 font-semibold text-navy-900">Payment Method</h2>
                <div className="space-y-2 text-sm">
                  <label className="flex items-center gap-3 rounded-lg border border-navy-100 p-3 has-[:checked]:border-atgblue-400 has-[:checked]:bg-atgblue-50">
                    <input type="radio" name="paymentMethod" value="WALLET" defaultChecked required />
                    ATG Wallet {wallet && <span className="text-navy-400">— balance {formatMoney(wallet.balanceMinor, wallet.currency)}</span>}
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border border-navy-100 p-3 has-[:checked]:border-atgblue-400 has-[:checked]:bg-atgblue-50">
                    <input type="radio" name="paymentMethod" value="CARD" />
                    Debit/Credit Card {paymentService.isLive() ? "(via Flutterwave)" : "(mock payment — no real gateway connected yet)"}
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border border-navy-100 p-3 has-[:checked]:border-atgblue-400 has-[:checked]:bg-atgblue-50">
                    <input type="radio" name="paymentMethod" value="BANK_TRANSFER" />
                    Bank Transfer {paymentService.isLive() ? "(via Flutterwave)" : "(mock payment — no real gateway connected yet)"}
                  </label>
                </div>
              </section>
            </CheckoutShippingSummary>
          </form>
        </div>
      </Container>
    </Section>
  );
}
