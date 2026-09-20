import "server-only";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

/**
 * Shared branded HTML shell for transactional emails — header, footer,
 * heading/body slot, optional CTA button, optional "Trending Now" product
 * section. Design approved via an Artifact mockup before being wired in
 * here — matches ATG Mall's actual brand tokens (tailwind.config.ts:
 * navy #0f2038, blue #1f6ce0, gold #dba934, sand #f3efe6/#e7ddc9), not a
 * new invented look.
 *
 * Deliberately plain inline styles + flex (no CSS grid, no <style> block)
 * so this degrades gracefully rather than breaking outright in older
 * desktop Outlook (Word rendering engine) — the one major client that
 * still doesn't support modern CSS reliably in email.
 *
 * Every notify() caller can pass this as `html` alongside its existing
 * plain-text `body` — body stays the source of truth for the in-app
 * Notification row and any non-email channel; html is email-only.
 */

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export interface EmailCta {
  label: string;
  url: string;
}

export async function renderEmailLayout(params: {
  eyebrow: string;
  heading: string;
  bodyHtml: string;
  cta?: EmailCta;
  includeTrending?: boolean;
}): Promise<string> {
  const trendingHtml = params.includeTrending ? await renderTrendingSection() : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(params.heading)}</title>
</head>
<body style="margin:0; font-family: Arial, Helvetica, sans-serif; background:#f3efe6;">
  <div style="width:100%; background:#f3efe6; padding:28px 0;">
    <div style="max-width:592px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden;">
      <div style="background:#0f2038; padding:26px 36px;">
        <span style="font-size:20px; font-weight:800; letter-spacing:0.02em; color:#ffffff;">ATG <span style="color:#dba934;">MALL</span></span>
      </div>
      <div style="padding:36px 40px 20px;">
        <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; color:#1f6ce0; margin-bottom:10px;">${escapeHtml(params.eyebrow)}</div>
        <div style="font-size:24px; font-weight:800; color:#091426; margin-bottom:14px;">${escapeHtml(params.heading)}</div>
        <div style="font-size:15px; line-height:1.6; color:#305582;">${params.bodyHtml}</div>
        ${
          params.cta
            ? `<div style="margin-top:22px;"><a href="${params.cta.url}" style="display:inline-block; background:#1f6ce0; color:#ffffff; font-size:14px; font-weight:600; padding:13px 26px; border-radius:10px; text-decoration:none;">${escapeHtml(params.cta.label)}</a></div>`
            : ""
        }
      </div>
      ${trendingHtml}
      <div style="background:#091426; padding:24px 40px;">
        <div style="font-size:12px; font-weight:600; color:#d6e0ec;">Apex Terra Global Limited &middot; Nigeria</div>
        <div style="font-size:11px; color:#4f74a0; margin-top:4px;">WhatsApp/Call: +234 704 394 5345 &middot; support@apexterraglobal.com</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function renderTrendingSection(): Promise<string> {
  const products = await db.product.findMany({
    where: { isFeatured: true, isActive: true },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  if (products.length === 0) return "";

  const cards = products
    .map(
      (p) =>
        `<a href="${APP_URL}/product/${p.slug}" style="display:inline-block; width:31%; margin:0 1%; vertical-align:top; text-decoration:none;">` +
        `<div style="border:1px solid #e7ddc9; border-radius:10px; overflow:hidden;">` +
        (p.images[0]
          ? `<img src="${p.images[0].url}" alt="${escapeHtml(p.name)}" width="170" style="width:100%; height:120px; object-fit:cover; display:block;">`
          : "") +
        `<div style="padding:10px;">` +
        `<div style="font-size:12px; font-weight:600; color:#182f4d; line-height:1.3;">${escapeHtml(p.name)}</div>` +
        `<div style="font-size:12px; font-weight:700; color:#1f6ce0; margin-top:4px;">${formatMoney(p.basePriceMinor, p.baseCurrency)}</div>` +
        `</div></div></a>`,
    )
    .join("");

  return `
      <div style="height:1px; background:#e7ddc9; margin:4px 40px;"></div>
      <div style="padding:28px 40px 36px;">
        <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; color:#c1912a; margin-bottom:8px;">TRENDING NOW</div>
        <div style="font-size:18px; font-weight:700; color:#091426; margin-bottom:18px;">Picked for you this week</div>
        <div style="text-align:left;">${cards}</div>
      </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
