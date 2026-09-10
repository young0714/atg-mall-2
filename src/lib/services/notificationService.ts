import "server-only";
import { db } from "@/lib/db";
import type { NotificationChannel } from "@prisma/client";

/**
 * NotificationService — dispatch abstraction for order/shipment lifecycle
 * events across Email / SMS / WhatsApp / Push / In-app.
 *
 * Phase 1 always writes an IN_APP `Notification` row (so the customer
 * dashboard has something real to show) and, for other channels, logs what
 * WOULD be sent rather than calling a real provider — no email/SMS/WhatsApp
 * provider is integrated yet. Wire a `Live*Transport` per channel behind the
 * `Transport` interface below when credentials and templates are ready.
 */

export const NOTIFICATION_EVENTS = {
  ORDER_CREATED: "ORDER_CREATED",
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  QUOTATION_READY: "QUOTATION_READY",
  PACKAGE_RECEIVED: "PACKAGE_RECEIVED",
  PACKAGE_CONSOLIDATED: "PACKAGE_CONSOLIDATED",
  SHIPMENT_CREATED: "SHIPMENT_CREATED",
  SHIPMENT_DEPARTED: "SHIPMENT_DEPARTED",
  SHIPMENT_ARRIVED: "SHIPMENT_ARRIVED",
  CUSTOMS_UPDATE: "CUSTOMS_UPDATE",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
} as const;

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[keyof typeof NOTIFICATION_EVENTS];

interface Transport {
  channel: NotificationChannel;
  send(params: { to: string; title: string; body: string }): Promise<void>;
}

class ConsoleMockTransport implements Transport {
  constructor(public channel: NotificationChannel) {}
  async send({ to, title }: { to: string; title: string; body: string }): Promise<void> {
    // Mock transport: no real Email/SMS/WhatsApp/Push provider is connected.
    // In development this simply logs what would have been sent.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log(`[NotificationService:MOCK:${this.channel}] to=${to} "${title}"`);
    }
  }
}

export interface NotificationService {
  notify(params: {
    userId: string;
    userContact: string;
    event: NotificationEvent;
    title: string;
    body: string;
    channels?: NotificationChannel[];
  }): Promise<void>;
}

class DefaultNotificationService implements NotificationService {
  private transports: Record<NotificationChannel, Transport> = {
    EMAIL: new ConsoleMockTransport("EMAIL"),
    SMS: new ConsoleMockTransport("SMS"),
    WHATSAPP: new ConsoleMockTransport("WHATSAPP"),
    PUSH: new ConsoleMockTransport("PUSH"),
    IN_APP: new ConsoleMockTransport("IN_APP"),
  };

  async notify({
    userId,
    userContact,
    event,
    title,
    body,
    channels = ["IN_APP"],
  }: {
    userId: string;
    userContact: string;
    event: NotificationEvent;
    title: string;
    body: string;
    channels?: NotificationChannel[];
  }): Promise<void> {
    await db.notification.create({
      data: { userId, channel: "IN_APP", event, title, body },
    });

    for (const channel of channels) {
      if (channel === "IN_APP") continue;
      await this.transports[channel].send({ to: userContact, title, body });
    }
  }
}

export const notificationService: NotificationService = new DefaultNotificationService();
