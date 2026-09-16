"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { addressSchema, checkoutSchema } from "@/lib/validation/schemas";
import { orderService, type OrderShipmentSpec } from "@/lib/services/orderService";
import { groupCartForShipping } from "@/lib/services/shipping/cartShipmentGrouping";
import { isActiveDestinationIso, currencyForDestinationIso } from "@/lib/services/destinationCountryService";
import { createCheckoutOtp, verifyCheckoutOtp } from "@/lib/services/otpService";
import type { Currency, PaymentMethod } from "@prisma/client";
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

type ResolvedCheckoutOrder =
  | {
      ok: true;
      addressId: string;
      destinationIso: string;
      currency: Currency;
      paymentMethod: PaymentMethod;
      shipments: OrderShipmentSpec[];
    }
  | { ok: false; error: string };

/**
 * Re-derives everything needed to place the order from the raw checkout
 * form fields — never trusts a client-submitted price. Called twice: once
 * (for validation only) before an OTP is issued, and again at confirm-time
 * so shipping quotes/cart contents are always fresh, not whatever they were
 * when the code was emailed.
 */
async function resolveCheckoutOrder(userId: string, payload: Record<string, string>): Promise<ResolvedCheckoutOrder> {
  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid checkout details" };
  }
  const { addressId, paymentMethod } = parsed.data;

  const address = await db.address.findFirst({ where: { id: addressId, userId } });
  if (!address) return { ok: false, error: "Address not found" };

  const cart = await db.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true } } },
  });
  if (!cart || cart.items.length === 0) return { ok: false, error: "Your cart is empty." };

  const profile = await db.customerProfile.findUnique({ where: { userId } });
  const destinationIso = address.countryIso;
  const currency = profile?.preferredCurrency ?? currencyForDestinationIso(destinationIso);

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
    currency,
  );

  if (unresolvedLines.length > 0) {
    return {
      ok: false,
      error: "Some items in your cart don't have shipping information configured yet. Please contact support.",
    };
  }

  const shipments: OrderShipmentSpec[] = [];
  for (const group of groups) {
    if (group.quote.options.length === 0) {
      return {
        ok: false,
        error: `Shipping isn't available from ${group.originName} to your destination yet. Please contact support or remove that item.`,
      };
    }

    const chosenServiceLevelId = String(payload[`shippingChoice_${group.shippingOriginId}`] ?? "");
    const chosenOption = group.quote.options.find((o) => o.serviceLevelId === chosenServiceLevelId);
    if (!chosenOption) {
      return { ok: false, error: `Select a shipping option for the shipment from ${group.originName}.` };
    }

    shipments.push({
      shippingOriginId: group.shippingOriginId,
      originNameSnapshot: group.originName,
      destinationCountryIso: destinationIso,
      carrierId: chosenOption.carrierId,
      carrierNameSnapshot: chosenOption.carrierName,
      serviceLevelNameSnapshot: chosenOption.serviceLevelName,
      actualWeightGrams: chosenOption.actualWeightGrams,
      volumetricWeightGrams: chosenOption.volumetricWeightGrams,
      chargeableWeightGrams: chosenOption.chargeableWeightGrams,
      carrierCostMinor: chosenOption.displayCarrierCostMinor,
      markupMinor: chosenOption.displayMarkupMinor,
      handlingFeeMinor: chosenOption.displayHandlingFeeMinor,
      customerPriceMinor: chosenOption.displayCustomerPriceMinor,
      estimatedDeliveryDaysMin: chosenOption.estimatedDeliveryDaysMin,
      estimatedDeliveryDaysMax: chosenOption.estimatedDeliveryDaysMax,
      rateSource: chosenOption.rateSource,
      rawProviderResponse: chosenOption.rawProviderResponse,
      lines: group.lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        weightGramsSnapshot: l.weightGrams,
      })),
    });
  }

  return { ok: true, addressId: address.id, destinationIso, currency, paymentMethod, shipments };
}

/** Validates the order and emails a verification code — nothing is placed yet. */
export async function initiateCheckoutOtpAction(formData: FormData) {
  const user = await requireUser();
  const payload = Object.fromEntries(formData) as Record<string, string>;

  const resolved = await resolveCheckoutOrder(user.id, payload);
  if (!resolved.ok) {
    redirect("/checkout?error=" + encodeURIComponent(resolved.error));
  }

  const { otpId } = await createCheckoutOtp({
    userId: user.id,
    email: user.email,
    purpose: "CHECKOUT",
    payload,
    actionDescription: "confirm your order",
  });

  redirect(`/verify-otp?otpId=${otpId}`);
}

export interface ConfirmCheckoutOtpResult {
  ok: boolean;
  error?: string;
}

/** Verifies the code, then — only then — re-derives and actually places the order. */
export async function confirmCheckoutOtpAction(otpId: string, code: string): Promise<ConfirmCheckoutOtpResult> {
  const user = await requireUser();
  const verified = await verifyCheckoutOtp({ otpId, code, userId: user.id });
  if (!verified.ok) {
    return { ok: false, error: verified.error };
  }

  const payload = verified.payload as Record<string, string>;
  const resolved = await resolveCheckoutOrder(user.id, payload);
  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }

  const { orderNumber, redirectUrl, failureReason } = await orderService.createOrderFromCart({
    userId: user.id,
    addressId: resolved.addressId,
    destinationIso: resolved.destinationIso,
    currency: resolved.currency,
    paymentMethod: resolved.paymentMethod,
    shipments: resolved.shipments,
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
