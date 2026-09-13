import "server-only";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";

// Anonymous visitors get a cart of their own, linked by an opaque token in
// a cookie instead of a userId — so adding to cart and browsing the cart
// never requires an account. The cart is only ever attached to a real user
// at checkout (login, registration, or continuing as a guest), via
// mergeGuestCartIntoUser below.
const GUEST_CART_COOKIE = "atg_guest_cart";
const GUEST_CART_MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // 60 days

function newGuestToken(): string {
  return randomBytes(24).toString("hex");
}

function setGuestCartCookie(token: string): void {
  cookies().set(GUEST_CART_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_CART_MAX_AGE_SECONDS,
  });
}

function clearGuestCartCookie(): void {
  cookies().set(GUEST_CART_COOKIE, "", { path: "/", maxAge: 0 });
}

/**
 * Resolves the current visitor's cart id without creating anything —
 * for read-only access (viewing the cart, updating/removing an existing
 * item). Returns null if the visitor has no cart yet.
 */
export async function getCartId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (user) {
    const cart = await db.cart.findUnique({ where: { userId: user.id }, select: { id: true } });
    return cart?.id ?? null;
  }

  const token = cookies().get(GUEST_CART_COOKIE)?.value;
  if (!token) return null;
  const cart = await db.cart.findUnique({ where: { guestToken: token }, select: { id: true } });
  return cart?.id ?? null;
}

/**
 * Resolves the current visitor's cart id, creating one (and a guest-cart
 * cookie, for anonymous visitors) if it doesn't exist yet. Use this from
 * the "add to cart" action — the one place a cart genuinely needs to
 * exist.
 */
export async function getOrCreateCartId(): Promise<string> {
  const user = await getCurrentUser();
  if (user) {
    const cart = await db.cart.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
      select: { id: true },
    });
    return cart.id;
  }

  const existingToken = cookies().get(GUEST_CART_COOKIE)?.value;
  if (existingToken) {
    const cart = await db.cart.findUnique({ where: { guestToken: existingToken }, select: { id: true } });
    if (cart) return cart.id;
  }

  const token = newGuestToken();
  const cart = await db.cart.create({ data: { guestToken: token }, select: { id: true } });
  setGuestCartCookie(token);
  return cart.id;
}

/**
 * Folds any anonymous guest cart into the now-authenticated user's cart —
 * called right after login, registration, or continuing as a guest.
 * Existing lines are quantity-merged rather than duplicated. Safe to call
 * even when there's no guest cart cookie (no-op).
 */
export async function mergeGuestCartIntoUser(userId: string): Promise<void> {
  const token = cookies().get(GUEST_CART_COOKIE)?.value;
  if (!token) return;

  const guestCart = await db.cart.findUnique({
    where: { guestToken: token },
    include: { items: true },
  });
  if (!guestCart) {
    clearGuestCartCookie();
    return;
  }

  const userCart = await db.cart.findUnique({ where: { userId }, include: { items: true } });

  if (!userCart) {
    // The user has no cart yet — just claim the guest cart outright.
    await db.cart.update({ where: { id: guestCart.id }, data: { userId, guestToken: null } });
    clearGuestCartCookie();
    return;
  }

  for (const guestItem of guestCart.items) {
    const existing = userCart.items.find(
      (i) => i.productId === guestItem.productId && i.variantId === guestItem.variantId,
    );
    if (existing) {
      await db.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + guestItem.quantity },
      });
    } else {
      await db.cartItem.create({
        data: {
          cartId: userCart.id,
          productId: guestItem.productId,
          variantId: guestItem.variantId,
          quantity: guestItem.quantity,
        },
      });
    }
  }

  await db.cart.delete({ where: { id: guestCart.id } });
  clearGuestCartCookie();
}
