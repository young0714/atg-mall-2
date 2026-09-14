import "server-only";
import { db } from "@/lib/db";
import type {
  Currency,
  OrderStatus,
  PaymentMethod,
  Prisma,
  ShippingRateSource,
} from "@prisma/client";
import { generateAtgNumber } from "./trackingService";
import { paymentService } from "./paymentService";
import { walletService } from "./walletService";
import { notificationService, NOTIFICATION_EVENTS } from "./notificationService";
import { currencyConversionService } from "./currencyConversionService";
import { commissionService } from "./commissionService";
import { sumMinor } from "@/lib/money";
import { fulfillmentTypeForSourcePlatform } from "@/lib/fulfillment";

/**
 * OrderService — order creation and status-transition logic shared by the
 * cart/checkout flow and the "accept quotation" flow (Shop for Me / Source a
 * Product both terminate here once a customer approves a Quotation).
 */

// One per shipping-origin group in the cart (see cartShipmentGrouping.ts) —
// becomes one `OrderShipment` row, with every OrderItem in `lines` stamped
// with its id + weightGramsSnapshot, so a later rate-card edit or origin
// rename never changes what an already-placed order shows.
export interface OrderShipmentSpec {
  shippingOriginId: string | null;
  originNameSnapshot: string;
  destinationCountryIso: string;
  carrierId: string | null;
  carrierNameSnapshot: string;
  serviceLevelNameSnapshot: string;
  actualWeightGrams: number;
  volumetricWeightGrams: number;
  chargeableWeightGrams: number;
  carrierCostMinor: number;
  markupMinor: number;
  handlingFeeMinor: number;
  customsEstimateMinor?: number | null;
  customerPriceMinor: number;
  estimatedDeliveryDaysMin: number;
  estimatedDeliveryDaysMax: number;
  rateSource: ShippingRateSource;
  rawProviderResponse?: unknown;
  lines: { productId: string; variantId: string | null; weightGramsSnapshot: number }[];
}

export interface CreateOrderFromCartParams {
  userId: string;
  addressId: string;
  destinationIso: string;
  currency: Currency;
  paymentMethod: PaymentMethod;
  domesticShippingMinor?: number;
  shipments: OrderShipmentSpec[];
  serviceFeeMinor?: number;
}

export interface OrderService {
  createOrderFromCart(
    params: CreateOrderFromCartParams,
  ): Promise<{ orderId: string; orderNumber: string; paymentStatus: string; redirectUrl?: string; failureReason?: string }>;
  createOrderFromQuotation(params: { quotationId: string; destinationIso: string; addressId?: string }): Promise<{ orderId: string; orderNumber: string }>;
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
      // Flat pricing: every variant sells at the product's own price —
      // variants are a choice (color/size/etc.), not a price adjustment.
      const unitPriceMinor = currencyConversionService.convert(
        item.product.basePriceMinor,
        item.product.baseCurrency,
        params.currency,
      );
      return { item, unitPriceMinor };
    });

    const subtotalMinor = sumMinor(
      ...itemsInOrderCurrency.map(({ item, unitPriceMinor }) => unitPriceMinor * item.quantity),
    );

    if (params.shipments.length === 0) {
      throw new Error("No shipments provided — every cart item must belong to a quoted shipping origin group");
    }

    const domesticShippingMinor = params.domesticShippingMinor ?? 0;
    const serviceFeeMinor = params.serviceFeeMinor ?? Math.round(subtotalMinor * 0.01);
    // Order.intlShippingMinor stays a derived sum of every shipment's
    // customerPriceMinor — kept for backward-compat with anything still
    // reading it directly (admin margin math, etc.); the per-shipment
    // breakdown itself lives on the OrderShipment rows below.
    const intlShippingMinor = sumMinor(...params.shipments.map((s) => s.customerPriceMinor));
    const totalMinor = sumMinor(subtotalMinor, domesticShippingMinor, intlShippingMinor, serviceFeeMinor);

    const orderNumber = generateAtgNumber("ATG", params.destinationIso);

    const orderId = await db.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: params.userId,
          addressId: params.addressId,
          source: "CATALOG",
          status: "PENDING_PAYMENT",
          destinationIso: params.destinationIso,
          currency: params.currency,
          subtotalMinor,
          serviceFeeMinor,
          domesticShippingMinor,
          intlShippingMinor,
          totalMinor,
        },
      });

      const itemByProductVariant = new Map(
        itemsInOrderCurrency.map(({ item, unitPriceMinor }) => [`${item.productId}_${item.variantId ?? ""}`, { item, unitPriceMinor }]),
      );

      for (const shipment of params.shipments) {
        const createdShipment = await tx.orderShipment.create({
          data: {
            orderId: order.id,
            shippingOriginId: shipment.shippingOriginId,
            originNameSnapshot: shipment.originNameSnapshot,
            destinationCountryIso: shipment.destinationCountryIso,
            carrierId: shipment.carrierId,
            carrierNameSnapshot: shipment.carrierNameSnapshot,
            serviceLevelNameSnapshot: shipment.serviceLevelNameSnapshot,
            actualWeightGrams: shipment.actualWeightGrams,
            volumetricWeightGrams: shipment.volumetricWeightGrams,
            chargeableWeightGrams: shipment.chargeableWeightGrams,
            carrierCostMinor: shipment.carrierCostMinor,
            markupMinor: shipment.markupMinor,
            handlingFeeMinor: shipment.handlingFeeMinor,
            customsEstimateMinor: shipment.customsEstimateMinor ?? null,
            customerPriceMinor: shipment.customerPriceMinor,
            currency: params.currency,
            estimatedDeliveryDaysMin: shipment.estimatedDeliveryDaysMin,
            estimatedDeliveryDaysMax: shipment.estimatedDeliveryDaysMax,
            rateSource: shipment.rateSource,
            rawProviderResponse: (shipment.rawProviderResponse ?? undefined) as Prisma.InputJsonValue | undefined,
          },
        });

        for (const line of shipment.lines) {
          const matched = itemByProductVariant.get(`${line.productId}_${line.variantId ?? ""}`);
          if (!matched) continue; // defensive — every line should have a matching cart item
          const { item, unitPriceMinor } = matched;
          await tx.orderItem.create({
            data: {
              orderId: order.id,
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
              orderShipmentId: createdShipment.id,
              weightGramsSnapshot: line.weightGramsSnapshot,
            },
          });
        }
      }

      return order.id;
    });

    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });

    await db.trackingEvent.create({
      data: {
        orderId: order.id,
        status: "PENDING_PAYMENT",
        description: "Order placed. Awaiting payment.",
      },
    });

    let paymentStatus: "SUCCESSFUL" | "PENDING" | "FAILED" = "PENDING";
    let redirectUrl: string | undefined;
    let failureReason: string | undefined;

    const user = await db.user.findUniqueOrThrow({ where: { id: params.userId } });

    if (params.paymentMethod === "WALLET") {
      const result = await walletService.debit({
        userId: params.userId,
        amountMinor: totalMinor,
        currency: params.currency,
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
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const initiation = await paymentService.charge({
        userId: params.userId,
        amountMinor: totalMinor,
        currency: params.currency,
        method: params.paymentMethod,
        orderNumber,
        customerEmail: user.email,
        customerName: user.fullName,
        redirectUrl: `${appUrl}/checkout/callback`,
      });
      paymentStatus = initiation.status;
      redirectUrl = initiation.redirectUrl;
      failureReason = initiation.failureReason;
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
      await commissionService.createForOrder(order.id);
      await db.cart.update({ where: { id: cart.id }, data: { items: { deleteMany: {} } } });
    }

    await notificationService.notify({
      userId: params.userId,
      userContact: user.email,
      event: NOTIFICATION_EVENTS.ORDER_CREATED,
      title: "Order placed",
      body: `Your ATG Mall order ${orderNumber} has been created.`,
      channels: ["IN_APP", "EMAIL"],
    });

    return { orderId: order.id, orderNumber, paymentStatus, redirectUrl, failureReason };
  }

  async createOrderFromQuotation({
    quotationId,
    destinationIso,
    addressId,
  }: {
    quotationId: string;
    destinationIso: string;
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

    const orderNumber = generateAtgNumber("ATG", destinationIso);
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
        destinationIso,
        currency: quotation.currency,
        subtotalMinor: quotation.productCostMinor,
        serviceFeeMinor: quotation.serviceFeeMinor,
        domesticShippingMinor: quotation.domesticShippingMinor,
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
    // ATG Wallet first (debit() converts from the quotation's currency to
    // whatever the wallet's own currency actually is); fall back to
    // leaving the order PENDING_PAYMENT so they can pay from the order
    // page (wallet top-up or a mock card/bank charge).
    const walletResult = await walletService.debit({
      userId,
      amountMinor: quotation.totalMinor,
      currency: quotation.currency,
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
      await commissionService.createForOrder(order.id);
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

    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    await notificationService.notify({
      userId,
      userContact: user.email,
      event: NOTIFICATION_EVENTS.ORDER_CREATED,
      title: "Order placed",
      body: `Your ATG Mall order ${orderNumber} has been created from quotation ${quotation.quotationNumber}.`,
      channels: ["IN_APP", "EMAIL"],
    });

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
