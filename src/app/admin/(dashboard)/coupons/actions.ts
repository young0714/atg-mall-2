"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { normaliseCode } from "@/lib/couponRules";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

interface ParsedCoupon {
  percentOff: number;
  windowType: "FIXED_DATES" | "SINCE_SIGNUP";
  startsAt: Date | null;
  endsAt: Date | null;
  daysAfterSignup: number | null;
  maxRedemptions: number | null;
  isActive: boolean;
}

// Dates are whole days in UTC (Gambia time): a code runs from 00:00 on the first day to the last moment of the last day.
function parseCoupon(fd: FormData): { ok: true; data: ParsedCoupon } | { ok: false; error: string } {
  const percentOff = Number(fd.get("percentOff"));
  if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 90) return { ok: false, error: "Percent off must be a whole number from 1 to 90." };

  const windowType = fd.get("windowType") === "SINCE_SIGNUP" ? "SINCE_SIGNUP" : "FIXED_DATES";
  let startsAt: Date | null = null;
  let endsAt: Date | null = null;
  let daysAfterSignup: number | null = null;

  if (windowType === "FIXED_DATES") {
    const from = String(fd.get("startsAt") ?? "");
    const to = String(fd.get("endsAt") ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return { ok: false, error: "Choose both a start date and an end date." };
    startsAt = new Date(`${from}T00:00:00.000Z`);
    endsAt = new Date(`${to}T23:59:59.999Z`);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return { ok: false, error: "Those dates aren't valid." };
    if (endsAt < startsAt) return { ok: false, error: "The end date must be on or after the start date." };
  } else {
    daysAfterSignup = Number(fd.get("daysAfterSignup"));
    if (!Number.isInteger(daysAfterSignup) || daysAfterSignup < 1 || daysAfterSignup > 365) return { ok: false, error: "Days after sign-up must be a whole number from 1 to 365." };
  }

  const cap = Number(fd.get("maxRedemptions") || 0);
  if (!Number.isInteger(cap) || cap < 0) return { ok: false, error: "The order limit must be 0 (no limit) or a whole number." };

  return {
    ok: true,
    data: { percentOff, windowType, startsAt, endsAt, daysAfterSignup, maxRedemptions: cap === 0 ? null : cap, isActive: fd.get("isActive") === "true" },
  };
}

export async function createCouponAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const code = normaliseCode(String(formData.get("code") ?? ""));
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
    redirect(`/admin/coupons?error=${encodeURIComponent("The code must be 3 to 30 letters, numbers, - or _ (no spaces).")}`);
  }
  const parsed = parseCoupon(formData);
  if (!parsed.ok) redirect(`/admin/coupons?error=${encodeURIComponent(parsed.error)}`);

  try {
    const coupon = await db.coupon.create({ data: { code, ...parsed.data! } });
    await db.auditLog.create({
      data: { actorId: staff.id, action: "COUPON_CREATED", entityType: "Coupon", entityId: coupon.id, summary: `Created coupon ${coupon.code} (${coupon.percentOff}% off)` },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      redirect(`/admin/coupons?error=${encodeURIComponent(`The code ${code} already exists. Pick another or edit the existing one.`)}`);
    }
    throw e;
  }
  revalidatePath("/admin/coupons");
  redirect("/admin/coupons?saved=1");
}

export async function updateCouponAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const id = String(formData.get("id"));
  const parsed = parseCoupon(formData);
  if (!parsed.ok) redirect(`/admin/coupons/${id}?error=${encodeURIComponent(parsed.error)}`);

  // The code itself never changes after creation: customers may already hold it.
  const coupon = await db.coupon.update({ where: { id }, data: parsed.data! });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "COUPON_UPDATED", entityType: "Coupon", entityId: id, summary: `Updated coupon ${coupon.code}` },
  });
  revalidatePath("/admin/coupons");
  redirect("/admin/coupons?saved=1");
}

export async function toggleCouponAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const id = String(formData.get("id"));
  const coupon = await db.coupon.findUniqueOrThrow({ where: { id } });
  const updated = await db.coupon.update({ where: { id }, data: { isActive: !coupon.isActive } });
  await db.auditLog.create({
    data: { actorId: staff.id, action: updated.isActive ? "COUPON_SWITCHED_ON" : "COUPON_SWITCHED_OFF", entityType: "Coupon", entityId: id, summary: `${updated.isActive ? "Switched on" : "Switched off"} coupon ${coupon.code}` },
  });
  revalidatePath("/admin/coupons");
  redirect("/admin/coupons?saved=1");
}
