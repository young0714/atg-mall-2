"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { addressSchema, checkoutSchema } from "@/lib/validation/schemas";
import { orderService } from "@/lib/services/orderService";
import { shippingService } from "@/lib/services/shippingService";
import { currencyConversionService } from "@/lib/services/currencyConversionService";
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

  const { addressId, shippingMethod, paymentMethod } = parsed.data;

  const address = await db.address.findFirst({ where: { id: addressId, userId: user.id } });
  if (!address) redirect("/checkout?error=Address+not+found");

  const cart = await db.cart.findUnique({
    where: { userId: user.id },
    include: { items: { include: { product: true } } },
  });
  if (!cart || cart.items.length === 0) redirect("/cart");

  const totalWeightGrams = cart!.items.reduce((sum, i) => sum + i.product.weightGrams * i.quantity, 0);

  const quote = await shippingService.getQuote({
    destinationCountry: address!.country,
    method: shippingMethod,
    weightGrams: totalWeightGrams,
  });

  const profile = await db.customerProfile.findUnique({ where: { userId: user.id } });
  const currency = profile?.preferredCurrency ?? (address!.country === "NIGERIA" ? "NGN" : "GMD");

  const intlShippingMinor = quote
    ? currencyConversionService.convert(quote.estimatedCostMinor, quote.currency, currency)
    : 0;

  // Cart items are priced in CNY (China supplier price); convert the subtotal
  // basis into the order currency by letting OrderService read the cart
  // directly — here we only need to pass shipping already converted.
  const { orderNumber } = await orderService.createOrderFromCart({
    userId: user.id,
    addressId: address!.id,
    destination: address!.country,
    currency,
    shippingMethod,
    paymentMethod,
    intlShippingMinor,
  });

  redirect(`/account/orders?justPlaced=${orderNumber}`);
}
