import "server-only";
import { db } from "@/lib/db";
import type {
  Country,
  Currency,
  OrderStatus,
  PaymentMethod,
  ShippingMethod,
} from "@prisma/client";
import { generateAtgNumber } from "./trackingService";
import { paymentService } from "./paymentService";
import { walletService } from "./walletService";
import { notificationService, NOTIFICATION_EVENTS } from "./notificationService";
import { currencyConversionService } from "./currencyConversionService";
import { sumMinor } from "@/lib/money";
import { fulfillmentTypeForSourcePlatform } from "@/lib/fulfillment";

/**
 * OrderService — order creation and status-transition logic shared by the
 * cart/checkout flow and the "accept quotation" flow (Shop for Me / Source a
 * Product both terminate here once a customer approves a Quotation).
 */

export interface CreateOrderFromCartParams {
  userId: string;
  addressId: string;
  destination: Country;
  currency: Currency;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  domesticShippingMinor?: number;
  intlShippingMinor: number;
  serviceFeeMinor?: number;
}

export interface OrderService {
  createOrderFromCart(params: CreateOrderFromCartParams): Promise<{ orderId: string; orderNumber: string; paymentStatus: string }>;
  createOrderFromQuotation(params: { quotationId: string; destination: Country; addressId?: string }): Promise<{ orderId: string; orderNumber: string }>;
  advanceStatus(orderId: string, status: OrderStatus, description?: string): Promise<void>;
}

class DefaultOrderService implements OrderService {
  async createOrderFromCart(params: CreateOrderFromCartParams) {
    const cart = await db.cart.findUnique({
      where: { userId: params.userId },
      include: { items: { include: { product: true, variant: true } } },
    });
    if (!cart || cart.items.length === 0) {
      throw new Error("Cart is empty");
    }
    // Defense-in-depth: affiliate products should never reach here (blocked
    // at the UI and in addToCartAction), but never let one become a normal
    // ATG order if it somehow does.
    if (cart.items.some((item) => item.product.sourcePlatform === "AFFILIATE")) {
      throw new Error("Cart contains an affiliate product, which cannot be purchased through ATG Mall directly");
    }

    // Cart items are priced in each product's supplier (base) currency —
    // almost always CNY. Convert every line into the order's currency before
    // summing, so subtotal/shipping/fees/total are never a mix of currencies.
    const itemsInOrderCurrency = cart.items.map((item) => {
      const unitPriceSourceMinor = item.product.basePriceMinor + (item.variant?.priceDeltaMinor ?? 0);
      const unitPriceMinor = currencyConversionService.convert(
        unitPriceSourceMinor,
        item.product.baseCurrency,
        params.currency,
      );
      return { item, unitPriceMinor };
    });

    const subtotalMinor = sumMinor(
      ...itemsInOrderCurrency.map(({ item, unitPriceMinor }) => unitPriceMinor * item.quantity),
    );

    const domesticShippingMinor = params.domesticShippingMinor ?? 0;
    const serviceFeeMinor = params.serviceFeeMinor ?? Math.round(subtotalMinor * 0.05);
    const totalMinor = sumMinor(
      subtotalMinor,
      domesticShippingMinor,
      params.intlShippingMinor,
      serviceFeeMinor,
    );

    const orderNumber = generateAtgNumber("ATG", params.destination);

    const order = await db.order.create({
      data: {
        orderNumber,
        userId: params.userId,
        addressId: params.addressId,
        source: "CATALOG",
        status: "PENDING_PAYMENT",
        destination: params.destination,
        currency: params.currency,
        subtotalMinor,
        serviceFeeMinor,
        domesticShippingMinor,
        intlShippingMinor: params.intlShippingMinor,
        totalMinor,
        items: {
          create: itemsInOrderCurrency.map(({ item, unitPriceMinor }) => ({
            productId: item.productId,
            variantId: item.variantId,
            nameSnapshot: item.product.name,
            imageSnapshot: undefined,
            quantity: item.quantity,
            unitPriceMinor,
            currency: params.currency,
            fulfillmentType: fulfillmentTypeForSourcePlatform(item.product.sourcePlatform, item.product.sellerId),
            // The product's own base price *is* its cost basis for ATG's own
            // catalog; for vendor/sourced items this is a placeholder until
            // a dedicated vendor-cost field exists — not a fabricated figure,
            // just the same number already shown as the product's price.
            costBasisMinor: item.product.basePriceMinor,
            costCurrency: item.product.baseCurrency,
            sourcePlatformSnapshot: item.product.sourcePlatform,
            sellerIdSnapshot: item.product.sellerId,
          })),
        },
      },
    });

    await db.trackingEvent.create({
      data: {
        orderId: order.id,
        status: "PENDING_PAYMENT",
        description: "Order placed. Awaiting payment.",
      },
    });

    let paymentStatus: "SUCCESSFUL" | "PENDING" | "FAILED" = "PENDING";

    if (params.paymentMethod === "WALLET") {
      const result = await walletService.debit({
        userId: params.userId,
        amountMinor: totalMinor,
        description: `Payment for order ${orderNumber}`,
        referenceType: "ORDER",
        referenceId: order.id,
      });
      paymentStatus = result.success ? "SUCCESSFUL" : "FAILED";
      await db.payment.create({
        data: {
          orderId: order.id,
          method: "WALLET",
          status: paymentStatus,
          amountMinor: totalMinor,
          currency: params.currency,
          providerName: "ATG_WALLET",
          providerRef: result.success ? `WALLET-${order.id}` : undefined,
        },
      });
    } else {
      const initiation = await paymentService.charge({
        amountMinor: totalMinor,
        currency: params.currency,
        method: params.paymentMethod,
        orderNumber,
      });
      paymentStatus = initiation.status;
      await db.payment.create({
        data: {
          orderId: order.id,
          method: params.paymentMethod,
          status: initiation.status,
          amountMinor: totalMinor,
          currency: params.currency,
          providerName: initiation.providerName,
          providerRef: initiation.providerRef,
        },
      });
    }

    if (paymentStatus === "SUCCESSFUL") {
      await db.order.update({ where: { id: order.id }, data: { status: "PAID" } });
      await db.trackingEvent.create({
        data: { orderId: order.id, status: "PAID", description: "Payment confirmed." },
      });
      await db.cart.update({ where: { id: cart.id }, data: { items: { deleteMany: {} } } });
    }

    const user = await db.user.findUniqueOrThrow({ where: { id: params.userId } });
    await notificationService.notify({
      userId: params.userId,
      userContact: user.email,
      event: NOTIFICATION_EVENTS.ORDER_CREATED,
      title: "Order placed",
      body: `Your ATG Mall order ${orderNumber} has been created.`,
    });

    return { orderId: order.id, orderNumber, paymentStatus };
  }

  async createOrderFromQuotation({
    quotationId,
    destination,
    addressId,
  }: {
    quotationId: string;
    destination: Country;
    addressId?: string;
  }) {
    const quotation = await db.quotation.findUniqueOrThrow({
      where: { id: quotationId },
      include: {
        shopForMeRequest: true,
        sourcingRequest: { include: { options: { include: { supplier: true } } } },
      },
    });

    const userId = quotation.shopForMeRequest?.userId ?? quotation.sourcingRequest?.userId;
    if (!userId) throw new Error("Quotation is not linked to a request");

    const orderNumber = generateAtgNumber("ATG", destination);
    const source = quotation.shopForMeRequestId ? "SHOP_FOR_ME" : "SOURCING";
    const name =
      quotation.shopForMeRequest?.productName ?? quotation.sourcingRequest?.productName ?? "Sourced item";

    // Shop for Me always goes through a China-based purchase on the
    // customer's behalf. Source a Product resolves from the customer's
    // selected supplier option when one exists (an international/non-China
    // supplier there means INTERNATIONAL_SOURCING); falls back to
    // CHINA_SOURCING, the common case, if no option was ever selected.
    const selectedOption = quotation.sourcingRequest?.options.find((o) => o.isSelected);
    const fulfillmentType = quotation.shopForMeRequestId
      ? "CHINA_SOURCING"
      : selectedOption?.supplier
        ? fulfillmentTypeForSourcePlatform(selectedOption.supplier.platform, null)
        : "CHINA_SOURCING";

    const order = await db.order.create({
      data: {
        orderNumber,
        userId,
        addressId,
        source,
        status: "PENDING_PAYMENT",
        destination,
        currency: quotation.currency,
        subtotalMinor: quotation.productCostMinor,
        serviceFeeMinor: quotation.serviceFeeMinor,
        domesticShippingMinor: quotation.chinaShippingMinor,
        intlShippingMinor: quotation.intlShippingMinor,
        otherChargesMinor: quotation.otherChargesMinor,
        totalMinor: quotation.totalMinor,
        shopForMeRequestId: quotation.shopForMeRequestId ?? undefined,
        sourcingRequestId: quotation.sourcingRequestId ?? undefined,
        items: {
          create: [
            {
              nameSnapshot: name,
              quantity: 1,
              unitPriceMinor: quotation.productCostMinor,
              currency: quotation.currency,
              fulfillmentType,
              costBasisMinor: quotation.productCostMinor,
              costCurrency: quotation.currency,
            },
          ],
        },
      },
    });

    await db.trackingEvent.create({
      data: { orderId: order.id, status: "PENDING_PAYMENT", description: "Quotation accepted. Awaiting payment." },
    });

    // Accepting a quotation implies intent to pay now — try the customer's
    // ATG Wallet first (their balance is already in the quotation's
    // currency); fall back to leaving the order PENDING_PAYMENT so they can
    // pay from the order page (wallet top-up or a mock card/bank charge).
    const walletResult = await walletService.debit({
      userId,
      amountMinor: quotation.totalMinor,
      description: `Payment for order ${orderNumber} (quotation ${quotation.quotationNumber})`,
      referenceType: "ORDER",
      referenceId: order.id,
    });

    if (walletResult.success) {
      await db.payment.create({
        data: {
          orderId: order.id,
          method: "WALLET",
          status: "SUCCESSFUL",
          amountMinor: quotation.totalMinor,
          currency: quotation.currency,
          providerName: "ATG_WALLET",
          providerRef: `WALLET-${order.id}`,
        },
      });
      await db.order.update({ where: { id: order.id }, data: { status: "PAID" } });
      await db.trackingEvent.create({
        data: { orderId: order.id, status: "PAID", description: "Payment confirmed from ATG Wallet." },
      });
    } else {
      await db.payment.create({
        data: {
          orderId: order.id,
          method: "WALLET",
          status: "FAILED",
          amountMinor: quotation.totalMinor,
          currency: quotation.currency,
          providerName: "ATG_WALLET",
        },
      });
    }

    if (quotation.shopForMeRequestId) {
      await db.shopForMeRequest.update({
        where: { id: quotation.shopForMeRequestId },
        data: { status: "CONVERTED_TO_ORDER" },
      });
    }
    if (quotation.sourcingRequestId) {
      await db.sourcingRequest.update({
        where: { id: quotation.sourcingRequestId },
        data: { status: "CONVERTED_TO_ORDER" },
      });
    }
    await db.quotation.update({ where: { id: quotationId }, data: { status: "ACCEPTED" } });

    return { orderId: order.id, orderNumber };
  }

  async advanceStatus(orderId: string, status: OrderStatus, description?: string): Promise<void> {
    await db.order.update({ where: { id: orderId }, data: { status } });
    await db.trackingEvent.create({
      data: {
        orderId,
        status,
        description: description ?? `Order status updated to ${status.replaceAll("_", " ")}.`,
      },
    });
  }
}

export const orderService: OrderService = new DefaultOrderService();
