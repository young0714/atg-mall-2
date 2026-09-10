# ATG Mall — Architecture Document

**ATG Mall** is a cross-border shopping platform operated by **Apex Terra Global Limited** (Nigeria), enabling customers in Nigeria and Gambia to shop, source, and receive products from China (1688, Taobao, Alibaba, and direct suppliers) through a unified shop → source → buy → consolidate → ship → deliver pipeline.

This document is the design reference for the codebase in this repository. It is written before implementation, per the project brief, and is kept in sync with what is actually built (see "Build status" markers).

---

## A. Product Architecture

ATG Mall is composed of seven cooperating product surfaces, all sharing one backend/data model:

1. **Marketplace/Catalog** — ATG's own curated product catalog (mocked 1688/Taobao-style listings + ATG's own products), browsable without an account.
2. **Sourcing Layer** — "Shop for Me" (customer supplies a product link/details, ATG buys it) and "Source a Product" (customer supplies a need, ATG's sourcing team finds supplier options). Both terminate in a **Quotation** the customer approves before payment.
3. **Order & Payment Layer** — Cart, checkout, orders, wallet, payments — all provider-agnostic behind service abstractions.
4. **Logistics Layer** — China warehouse receiving, consolidation/repacking, shipment creation (air/sea/courier/LCL/FCL), and tracking, surfaced to customers as **Packages** and **Shipments**.
5. **Marketplace (Phase 3)** — Seller accounts, storefronts, commissions, payouts — modeled in the schema now, UI deferred.
6. **Admin/Ops Console** — a fully separate app section (`/admin`) for staff, gated by RBAC, covering every operational surface above.
7. **Notification Layer** — a provider-agnostic dispatcher for order/shipment lifecycle events (email/SMS/WhatsApp/push), mocked in Phase 1.

### Core business flow

```
SHOP / SOURCE  →  BUY  →  CONSOLIDATE  →  SHIP  →  DELIVER
   catalog        order      warehouse      shipment   package
   sourcing req   payment    consolidation  tracking   delivered
   shop-for-me    wallet
```

A customer reaches ATG Mall through the catalog (browse & buy now), or through a request (Shop for Me / Source a Product) that becomes a Quotation, which becomes an Order once accepted and paid. Every Order produces one or more Packages once the supplier ships to the China warehouse; packages are received, inspected, optionally consolidated, then attached to a Shipment; the Shipment is tracked to final delivery in Nigeria or Gambia.

---

## B. Technical Architecture

- **Framework**: Next.js 14 (App Router), TypeScript, React Server Components where practical, client components for interactive UI (cart, calculators, forms).
- **Styling**: Tailwind CSS with a custom ATG design system (see `tailwind.config.ts` / `THEME.md`).
- **Database**: PostgreSQL 16.
- **ORM**: Prisma.
- **API layer**: Next.js Route Handlers under `app/api/**` — a REST-shaped JSON API, structured so the same endpoints can serve a future Android/iOS client (versioned under `/api/v1`).
- **Auth**: Credentials-based auth (email + password, bcrypt hashing) with signed, httpOnly session cookies (`iron-session`-style JWT) — no third-party account required, since Nigeria/Gambia customers may not have Google/Apple accounts uniformly. Session carries `userId` + `role`.
- **Authorization**: Central RBAC map (`lib/rbac.ts`) checked in middleware and in each API route / server action.
- **Validation**: `zod` schemas shared between client forms and API route handlers.
- **File uploads**: local `/public/uploads` in Phase 1 (behind a `StorageService` abstraction so S3/Cloudinary can be swapped in later) with type/size validation.
- **State**: Server-first; small client stores (React context) for cart and destination/currency selection, persisted to a cookie.
- **External integrations**: Every external dependency (1688, Taobao, payments, couriers, notifications) is hidden behind a `Service` interface in `lib/services/*` with a `Mock*` implementation used by default, and a documented seam for a `Live*` implementation later. No code path silently pretends a live integration exists.
- **Monorepo-readiness**: single Next.js app today; `lib/` (services, domain logic, validation) is framework-agnostic TypeScript so it can be extracted into a shared package consumed by a future React Native app or a standalone API service without rewriting business logic.

### Why this stack

Next.js gives one deployable app for marketing pages, the customer app, and the admin console, with route-level code splitting and good SEO (SSR/ISR) for public catalog pages — important given the SEO targets in the brief. Prisma + Postgres gives a normalized, transactional store suited to ledgered wallets and multi-stage order/shipment state machines. Because everything customer-facing is a JSON API under `/api/v1`, a Phase 4 mobile app talks to the same backend without change.

---

## C. Database Schema

Implemented in `prisma/schema.prisma`. Summary (see that file for full field lists, enums, and relations):

- **Identity & access**: `User`, `Role` (enum), `CustomerProfile`, `Address`, `AuditLog`
- **Catalog**: `Category`, `Supplier`, `Product`, `ProductVariant`, `ProductImage`, `Review`
- **Sourcing**: `SourcingRequest`, `SourcingOption`, `ShopForMeRequest`, `Quotation`, `QuotationLineItem`
- **Commerce**: `Cart`, `CartItem`, `Order`, `OrderItem`, `Coupon`, `Payment`
- **Wallet**: `Wallet`, `WalletTransaction` (append-only ledger)
- **Logistics**: `Warehouse`, `WarehouseReceipt`, `Package`, `Consolidation`, `ConsolidationPackage`, `Shipment`, `ShipmentPackage`, `TrackingEvent`, `ShippingRate`, `DeliveryZone`
- **Marketplace (schema only, Phase 3 UI)**: `Seller`, `Commission`, `Payout`
- **Support/ops**: `Notification`, `SupportTicket`, `SupportMessage`

Design notes:
- All money fields are integer **minor units** (kobo/butut) tagged with an explicit `currency` column — never floats.
- `WalletTransaction` is append-only; `Wallet.balance` is a cached, recomputed-on-write projection, never mutated directly outside the ledger-writing transaction.
- `Order.status` and `Package.status` and `Shipment.status` are enums matching the brief's status lists exactly, plus a `*StatusHistory` pattern via `TrackingEvent`/`AuditLog` so timelines are queryable, not inferred.
- `Product` carries `sourcePlatform` (`ATG` | `MOCK_1688` | `MOCK_TAOBAO` | `ALIBABA` | `SELLER`) and a nullable `sourceUrl`/`sourceProductId` so the same table serves ATG's own catalog and future live marketplace imports without a schema change.

Full schema is shown before backend implementation, as requested — see `prisma/schema.prisma` after scaffolding, and the ER summary appended to this file in `SCHEMA.md`.

---

## D. Main User Flows

1. **Browse & Buy**: Home → Shop/Category → Product detail (see landed cost) → Add to cart / Buy Now → Checkout (address, shipping method, payment) → Order created (`PENDING_PAYMENT` → `PAID`) → tracked in My Orders.
2. **Shop for Me**: Shop for Me form (URL/name/image/qty/variants/destination) → `ShopForMeRequest` created (`SUBMITTED`) → staff reviews in admin, issues a `Quotation` → customer sees quotation in My Orders/Quotations, accepts → pays (wallet or payment provider) → `ShopForMeRequest` becomes an `Order` → normal fulfillment pipeline.
3. **Source a Product**: Source a Product form (image/name/URL/qty/target price/destination) → `SourcingRequest` created → sourcing staff attach 1..N `SourcingOption`s (supplier, price, MOQ, shipping, sourcing fee, images) → customer compares options in their dashboard, approves one → generates a `Quotation` → same accept/pay/fulfill path as above.
4. **Fulfillment**: Order paid → (mock) supplier purchase → package(s) arrive at China warehouse → `WarehouseReceipt` logged (photos/weight/dimensions) → package status progresses `RECEIVED` → `INSPECTION` → optionally `AWAITING_CUSTOMER_INSTRUCTION`/`CONSOLIDATION` → `READY_TO_SHIP` → attached to a `Shipment` → `SHIPPED` → `IN_TRANSIT` → `CUSTOMS` → `OUT_FOR_DELIVERY` → `DELIVERED`. Every transition writes a `TrackingEvent`.
5. **Tracking**: Anyone with an `ATG-XX-######` number can look up a shipment/package's public timeline without logging in.
6. **Wallet**: Customer deposits (mock payment) → `WalletTransaction(type=DEPOSIT)` → balance increases; paying for an order debits the wallet with a `WalletTransaction(type=PAYMENT)` referencing the order; refunds create `WalletTransaction(type=REFUND)`. Statement = paginated transaction list.

---

## E. Admin Workflow

Admin (`/admin`, role-gated) mirrors the customer flows from the operations side:

- **Dashboard**: KPI tiles (orders, revenue, GMV, shipping/sourcing revenue, active customers, packages in warehouse/in transit/delivered, customers by country) computed from live data.
- **Products/Categories**: CRUD for the catalog, image upload, variant/pricing management.
- **Shop for Me / Source a Product queues**: staff pick up a request, fill in cost breakdown (product cost, China shipping, ATG fee, intl shipping, other), issue a Quotation; sourcing staff attach multiple supplier options for Source-a-Product.
- **Warehouse**: receive a package (assign to customer/order, record supplier, tracking #, weight/dimensions, photos), build `Consolidation`s, mark ready-to-ship.
- **Shipping/Shipments**: create shipments from ready packages, choose method, generate ATG tracking numbers, push `TrackingEvent`s, manage `ShippingRate` tables per lane/method (admin-configured, never hardcoded as "real" carrier rates).
- **Orders/Payments/Wallets/Refunds**: full visibility and manual overrides (e.g., manual refund with a ledger entry + audit log row).
- **Customers/Sellers**: account management, seller approval queue (schema-ready, minimal UI in Phase 1).
- **Settings**: delivery zones (NG/GM), shipping rate tables, categories, coupons — all admin-managed rather than hardcoded.

All mutating admin actions write an `AuditLog` row (actor, action, entity, before/after summary, timestamp).

---

## F. API Architecture

REST-shaped JSON API under `app/api/v1/*`, consumed by the Next.js frontend today and designed for a future mobile client:

```
/api/v1/auth/register            POST
/api/v1/auth/login               POST
/api/v1/auth/logout              POST
/api/v1/auth/me                  GET

/api/v1/catalog/products         GET  (search, filter, paginate)
/api/v1/catalog/products/:slug   GET
/api/v1/catalog/categories       GET

/api/v1/cart                     GET, POST, DELETE
/api/v1/checkout                 POST

/api/v1/orders                   GET (mine), POST
/api/v1/orders/:id               GET

/api/v1/packages                 GET (mine)
/api/v1/packages/:id             GET

/api/v1/shipments/:id            GET
/api/v1/track/:trackingNumber    GET  (public)

/api/v1/wallet                   GET
/api/v1/wallet/deposit           POST
/api/v1/wallet/transactions      GET

/api/v1/shop-for-me              GET (mine), POST
/api/v1/sourcing-requests        GET (mine), POST
/api/v1/quotations/:id/accept    POST

/api/v1/shipping/quote           POST  (shipping calculator)

/api/v1/admin/*                  role-gated mirror of the above plus
                                  products, categories, suppliers,
                                  warehouse receipts, consolidations,
                                  shipments, shipping-rates, users, audit-log
```

Every route: validates input with `zod`, resolves the session, checks `lib/rbac.ts` for the required permission, calls into `lib/services/*` or `lib/db` (Prisma), and returns a typed JSON envelope `{ data } | { error }`.

---

## G. MVP Development Roadmap

**Phase 1 (this build)** — polished functional MVP on mock/local data: homepage, catalog, product detail w/ landed-cost calculator, search/categories, auth, customer dashboard, cart/checkout (mock payment), Shop for Me, Source a Product, My Orders w/ timeline, My Packages, public tracking, NG/GM selection, admin dashboard with product/order/package/warehouse/shipping-rate management, shipping calculator.

**Phase 2** — real 1688/Taobao integration (once authorized API access exists), real payment gateways (Paystack/Flutterwave for NG, appropriate GM providers), real wallet funding rails, China warehouse system integration, real courier/freight tracking APIs, live notifications (email/SMS/WhatsApp/push).

**Phase 3** — Marketplace: seller registration/storefronts, product approval, commissions, payouts, reviews/ratings surfaced publicly, promotions engine.

**Phase 4** — Mobile apps (Android/iOS) on the same `/api/v1` backend, likely React Native or native clients.

---

## H. Recommended Technology Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| UI | React 18, Tailwind CSS, Radix primitives for accessible interactive components |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Auth | Custom credentials auth, bcrypt, signed JWT session cookie |
| Validation | zod |
| API | Next.js Route Handlers, REST-shaped, versioned `/api/v1` |
| File storage (Phase 1) | Local filesystem via `StorageService` abstraction |
| Background/notifications | `NotificationService` abstraction (console/mock transport in Phase 1) |
| Testing | Vitest (unit) + smoke scripts for critical flows |
| Deployment target | Any Node-hosting platform (Vercel, Render, Fly.io, a VPS) with managed Postgres |

---

## I. Folder Structure

```
atg-mall/
├── ARCHITECTURE.md
├── SCHEMA.md
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   └── uploads/
├── src/
│   ├── app/
│   │   ├── (marketing)/                 # public site
│   │   │   ├── page.tsx                 # homepage
│   │   │   ├── about/
│   │   │   ├── legal/
│   │   │   │   ├── terms/ privacy/ refund-policy/ shipping-policy/
│   │   │   │   ├── prohibited-items/ seller-terms/ customer-agreement/
│   │   │   │   └── contact/
│   │   ├── (shop)/
│   │   │   ├── shop/                    # catalog, [categorySlug]
│   │   │   ├── product/[slug]/
│   │   │   ├── shop-from-china/
│   │   │   ├── shop-for-me/
│   │   │   ├── source-a-product/
│   │   │   ├── cart/
│   │   │   └── checkout/
│   │   ├── (account)/
│   │   │   ├── account/
│   │   │   ├── orders/[id]/
│   │   │   ├── packages/
│   │   │   ├── wallet/
│   │   │   └── quotations/
│   │   ├── track/[trackingNumber]/
│   │   ├── (auth)/login/  register/
│   │   ├── admin/
│   │   │   ├── layout.tsx               # RBAC-gated shell
│   │   │   ├── page.tsx                 # dashboard
│   │   │   ├── products/ categories/ suppliers/
│   │   │   ├── orders/ packages/ warehouse/ consolidation/
│   │   │   ├── shipments/ shipping-rates/
│   │   │   ├── shop-for-me/ sourcing/
│   │   │   ├── payments/ wallets/ refunds/
│   │   │   ├── customers/ sellers/ coupons/ reviews/
│   │   │   └── settings/
│   │   └── api/v1/**                    # route handlers mirroring section F
│   ├── components/
│   │   ├── ui/                          # Button, Card, Badge, Input, Modal...
│   │   ├── layout/                      # Header, Footer, MobileNav
│   │   ├── shop/                        # ProductCard, LandedCostBreakdown...
│   │   ├── tracking/                    # StatusTimeline
│   │   └── admin/
│   ├── lib/
│   │   ├── db.ts                        # Prisma client singleton
│   │   ├── auth.ts / session.ts
│   │   ├── rbac.ts
│   │   ├── validation/                  # zod schemas
│   │   ├── services/
│   │   │   ├── oneSixEightEightProductService.ts
│   │   │   ├── taobaoProductService.ts
│   │   │   ├── pricingService.ts
│   │   │   ├── currencyConversionService.ts
│   │   │   ├── orderService.ts
│   │   │   ├── warehouseService.ts
│   │   │   ├── shippingService.ts
│   │   │   ├── trackingService.ts
│   │   │   ├── paymentService.ts
│   │   │   └── notificationService.ts
│   │   └── mock-data/
│   └── types/
├── tailwind.config.ts
├── next.config.mjs
├── package.json
└── .env.example
```

---

### Build status legend used elsewhere in this repo
- ✅ Implemented and working against the local Postgres database
- 🧩 Mocked by design (clearly-labeled placeholder service; real integration requires a real API/credentials)
- 🚧 Schema/architecture ready, UI deferred to a later phase (as the brief explicitly allows for the marketplace)
