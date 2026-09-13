import "server-only";
import { db } from "@/lib/db";
import type { NotificationChannel } from "@prisma/client";

/**
 * NotificationService — dispatch abstraction for order/shipment lifecycle
 * events across Email / SMS / WhatsApp / Push / In-app.
 *
 * Always writes an IN_APP `Notification` row (so the customer dashboard has
 * something real to show). EMAIL sends for real via Resend when
 * RESEND_API_KEY is set, falling back to a console-log mock otherwise.
 * SMS/WhatsApp/Push remain mocked — no provider integrated yet. Wire a
 * `Live*Transport` per channel behind the `Transport` interface below when
 * credentials and templates are ready.
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
  ACCOUNT_ACCESS_LINK: "ACCOUNT_ACCESS_LINK",
} as const;

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[keyof typeof NOTIFICATION_EVENTS];

interface Transport {
  channel: NotificationChannel;
  send(params: { to: string; title: string; body: string }): Promise<void>;
}

class ConsoleMockTransport implements Transport {
  constructor(public channel: NotificationChannel) {}
  async send({ to, title }: { to: string; title: string; body: string }): Promise<void> {
    // Mock transport: no real SMS/WhatsApp/Push provider is connected.
    // In development this simply logs what would have been sent.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log(`[NotificationService:MOCK:${this.channel}] to=${to} "${title}"`);
    }
  }
}

const RESEND_FROM = process.env.RESEND_FROM_EMAIL || "ATG Mall <support@apexterraglobal.com>";

// Real transport via Resend's REST API (https://resend.com/docs/api-reference/emails/send-email).
// Falls back to the console mock when RESEND_API_KEY isn't set, so local
// development and any environment without the key still behaves as before.
class ResendEmailTransport implements Transport {
  channel: NotificationChannel = "EMAIL";
  constructor(private apiKey: string) {}

  async send({ to, title, body }: { to: string; title: string; body: string }): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to,
        subject: title,
        text: body,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      // eslint-disable-next-line no-console
      console.error(`[NotificationService:Resend] failed to=${to} status=${res.status} ${detail}`);
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
    EMAIL: process.env.RESEND_API_KEY
      ? new ResendEmailTransport(process.env.RESEND_API_KEY)
      : new ConsoleMockTransport("EMAIL"),
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
