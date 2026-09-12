"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { addressSchema, checkoutSchema } from "@/lib/validation/schemas";
import { orderService, type OrderShipmentSpec } from "@/lib/services/orderService";
import { groupCartForShipping } from "@/lib/services/shipping/cartShipmentGrouping";
import { destinationCountryToIsoCode } from "@/lib/services/storeOrigin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function addAddressAction(formData: FormData) {
  const user = await requireUser();
  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/checkout?error=" + encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid address"));
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
  const currency = profile?.preferredCurrency ?? (address!.country === "NIGERIA" ? "NGN" : "GMD");
  const destinationIso = destinationCountryToIsoCode(address!.country);

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

  const { orderNumber } = await orderService.createOrderFromCart({
    userId: user.id,
    addressId: address!.id,
    destination: address!.country,
    currency,
    paymentMethod,
    shipments,
  });

  redirect(`/account/orders?justPlaced=${orderNumber}`);
}
