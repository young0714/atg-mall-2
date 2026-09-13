"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { addressSchema, checkoutSchema } from "@/lib/validation/schemas";
import { orderService, type OrderShipmentSpec } from "@/lib/services/orderService";
import { groupCartForShipping } from "@/lib/services/shipping/cartShipmentGrouping";
import { isActiveDestinationIso, currencyForDestinationIso } from "@/lib/services/destinationCountryService";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/**
 * Server-side price integrity (shipping-engine spec requirement): the only
 * client input `placeOrderAction` reads for shipping is a `serviceLevelId`
 * per shipment group — never a price. Every `*Minor` amount charged comes
 * from re-running `groupCartForShipping`/`shippingCalculationService`
 * inside this action against server-derived data (the DB cart, the
 * looked-up address's country, the profile's currency), so a tampered
 * hidden price field has nothing to tamper — there isn't one.
 */
export async function addAddressAction(formData: FormData) {
  const user = await requireUser();
  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/checkout?error=" + encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid address"));
  }
  if (!(await isActiveDestinationIso(parsed.data!.countryIso))) {
    redirect("/checkout?error=" + encodeURIComponent("Select a valid country."));
  }

  const existingCount = await db.address.count({ where: { userId: user.id } });
  await db.address.create({
    data: { ...parsed.data, userId: user.id, isDefault: existingCount === 0 },
  });

  revalidatePath("/checkout");
}

export async function placeOrderAction(formData: FormData) {
  const user = await requireUser();
  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/checkout?error=" + encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid checkout details"));
  }

  const { addressId, paymentMethod } = parsed.data;

  const address = await db.address.findFirst({ where: { id: addressId, userId: user.id } });
  if (!address) redirect("/checkout?error=Address+not+found");

  const cart = await db.cart.findUnique({
    where: { userId: user.id },
    include: { items: { include: { product: true } } },
  });
  if (!cart || cart.items.length === 0) redirect("/cart");

  const profile = await db.customerProfile.findUnique({ where: { userId: user.id } });
  const destinationIso = address!.countryIso;
  const currency = profile?.preferredCurrency ?? currencyForDestinationIso(destinationIso);

  // Re-derive shipping groups and quotes SERVER-SIDE from the cart and the
  // selected address — never trust a client-submitted price. The only
  // client input used below is which serviceLevelId was picked per group;
  // its actual price is always looked up fresh here.
  const { groups, unresolvedLines } = await groupCartForShipping(
    cart!.items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
      weightGrams: i.product.weightGrams,
      shippingOriginId: i.product.shippingOriginId,
      sourcePlatform: i.product.sourcePlatform,
    })),
    destinationIso,
    currency,
  );

  if (unresolvedLines.length > 0) {
    redirect(
      "/checkout?error=" +
        encodeURIComponent("Some items in your cart don't have shipping information configured yet. Please contact support."),
    );
  }

  const shipments: OrderShipmentSpec[] = [];
  for (const group of groups) {
    if (group.quote.options.length === 0) {
      redirect(
        "/checkout?error=" +
          encodeURIComponent(
            `Shipping isn't available from ${group.originName} to your destination yet. Please contact support or remove that item.`,
          ),
      );
    }

    const chosenServiceLevelId = String(formData.get(`shippingChoice_${group.shippingOriginId}`) ?? "");
    const chosenOption = group.quote.options.find((o) => o.serviceLevelId === chosenServiceLevelId);
    if (!chosenOption) {
      redirect(
        "/checkout?error=" +
          encodeURIComponent(`Select a shipping option for the shipment from ${group.originName}.`),
      );
    }

    shipments.push({
      shippingOriginId: group.shippingOriginId,
      originNameSnapshot: group.originName,
      destinationCountryIso: destinationIso,
      carrierId: chosenOption!.carrierId,
      carrierNameSnapshot: chosenOption!.carrierName,
      serviceLevelNameSnapshot: chosenOption!.serviceLevelName,
      actualWeightGrams: chosenOption!.actualWeightGrams,
      volumetricWeightGrams: chosenOption!.volumetricWeightGrams,
      chargeableWeightGrams: chosenOption!.chargeableWeightGrams,
      carrierCostMinor: chosenOption!.displayCarrierCostMinor,
      markupMinor: chosenOption!.displayMarkupMinor,
      handlingFeeMinor: chosenOption!.displayHandlingFeeMinor,
      customerPriceMinor: chosenOption!.displayCustomerPriceMinor,
      estimatedDeliveryDaysMin: chosenOption!.estimatedDeliveryDaysMin,
      estimatedDeliveryDaysMax: chosenOption!.estimatedDeliveryDaysMax,
      rateSource: chosenOption!.rateSource,
      rawProviderResponse: chosenOption!.rawProviderResponse,
      lines: group.lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        weightGramsSnapshot: l.weightGrams,
      })),
    });
  }

  const { orderNumber, redirectUrl, failureReason } = await orderService.createOrderFromCart({
    userId: user.id,
    addressId: address!.id,
    destinationIso,
    currency,
    paymentMethod,
    shipments,
  });

  // Card/Bank Transfer via a live gateway: send the browser to the hosted
  // checkout page instead of the order-confirmation page — payment isn't
  // actually confirmed until the webhook/callback fires.
  if (redirectUrl) {
    redirect(redirectUrl);
  }

  const failureSuffix = failureReason ? `&paymentError=${encodeURIComponent(failureReason)}` : "";
  redirect(`/account/orders?justPlaced=${orderNumber}${failureSuffix}`);
}
