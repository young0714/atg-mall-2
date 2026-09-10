# ATG Mall

**Shop Global. Delivered Local.**

ATG Mall is a cross-border shopping and logistics platform connecting customers in 🇳🇬 Nigeria and 🇬🇲 Gambia to
suppliers in China (1688, Taobao, Alibaba). It is a product of **Apex Terra Global Limited** — a separate,
consumer-facing platform from the corporate site at [apexterraglobal.com](https://apexterraglobal.com).

Full product and technical architecture, database schema (with an ER diagram), and the phased roadmap are documented
in [`ARCHITECTURE.md`](./ARCHITECTURE.md) and [`SCHEMA.md`](./SCHEMA.md) — read those first for the "why" behind the
structure of this codebase. Ready to put this live on a real domain? See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the
full Vercel + custom-domain walkthrough.

---

## ⚠️ Important: this build has not been compiled or run

This codebase was hand-written directly to spec (Next.js 14 App Router, TypeScript, Tailwind CSS, Prisma/PostgreSQL)
in an environment **without npm registry access**, so `npm install`, `next build`, `next dev` and the Prisma CLI
could not be run here to prove the project compiles and boots. Every file was written carefully and cross-checked for
internal consistency (import paths, Prisma model/field/enum names, and named exports were verified with automated
scans — no broken imports or missing exports were found, and one genuinely missing dependency, `server-only`, was
caught this way and added to `package.json`). Even so, **you should expect to fix at least a few small issues** —
most likely TypeScript type errors — the first time you run `npm run build` or `npm run typecheck`, since no
TypeScript compiler or bundler has actually processed this code yet. Please treat the very first `npm install` +
`npm run typecheck` as part of setup, not as a sign something went wrong.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript, React 18 |
| Styling | Tailwind CSS, custom ATG design tokens (navy/blue/green/gold) |
| Database | PostgreSQL + Prisma ORM |
| Auth | Custom email/password auth, JWT session cookies (`jose`), bcrypt password hashing |
| Validation | Zod |
| Mutations | Next.js Server Actions (customer & admin), plus a REST API under `/api/v1/*` for future mobile clients |

## What's real vs. mocked by design

Per the brief, this MVP does **not** fabricate live third-party integrations. Every external dependency sits behind a
clean service interface in `src/lib/services/`, with a `Mock*` implementation used today and a documented seam for a
`Live*` implementation later:

- **1688 / Taobao product data** — `oneSixEightEightProductService.ts` / `taobaoProductService.ts` return a small set
  of hand-written, realistic sample listings. No live API is called.
- **Payments** — `paymentService.ts` simulates success/failure. No card numbers are collected or processed.
- **Shipping rates** — `shippingService.ts` reads admin-configured `ShippingRate` rows from the database (editable
  under **Admin → Shipping Rates**). If no rate is configured for a route, it returns `null` rather than inventing one.
- **Currency conversion** — `currencyConversionService.ts` uses a static, clearly-labeled indicative rate table.
- **Notifications** (Email/SMS/WhatsApp/Push) — always recorded in-app; other channels log to the console in
  development via `ConsoleMockTransport` rather than sending real messages.
- **File storage** — uploads are saved to `public/uploads/` on the local filesystem, documented as a Phase 1
  placeholder for S3/Cloudinary.

Everything else — accounts, RBAC, catalog, cart/checkout, Shop for Me, Source a Product with quotations, the
ATG Wallet ledger, warehouse receiving, consolidation, shipments, tracking, the full admin dashboard, coupons,
reviews, support tickets, and the legal/SEO pages — is fully implemented against a real PostgreSQL schema.

## Local setup

### Prerequisites

- Node.js **18.18+**
- PostgreSQL **14+** running locally or reachable via a connection string

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env:
#   DATABASE_URL      — your Postgres connection string
#   AUTH_SECRET        — a long random string, e.g. `openssl rand -base64 48`

# 3. Create the database schema
npx prisma generate
npx prisma migrate dev --name init

# 4. Seed realistic demo data (categories, products, suppliers, staff, demo
#    customers, a sample order/package/shipment with tracking history, etc.)
npm run db:seed

# 5. Type-check (recommended first run, see the warning above)
npm run typecheck

# 6. Start the dev server
npm run dev
```

Then open **http://localhost:3000**.

### Demo logins (seeded by `npm run db:seed`)

**Staff** (sign in at `/admin/login`) — password for all: `AtgMall#2026`

| Email | Role |
|---|---|
| admin@atgmall.com | Super Admin |
| ops@atgmall.com | Operations Admin |
| sourcing@atgmall.com | Sourcing Staff |
| warehouse@atgmall.com | Warehouse Staff |
| shipping@atgmall.com | Shipping Staff |
| finance@atgmall.com | Finance Staff |
| support@atgmall.com | Customer Support |

**Customers** (sign in at `/login`) — password: `Customer#2026`

| Email | Country |
|---|---|
| amaka.customer@example.com | 🇳🇬 Nigeria |
| lamin.customer@example.com | 🇬🇲 Gambia |

The Nigerian demo customer has a sample order already moving through the fulfillment pipeline, with a full tracking
history — sign in and check **My Orders** / **My Packages**, or look up `ATG-NG-2026000123` under **Track Shipment**.

## Project structure

```
src/
  app/                # Next.js App Router — pages, layouts, server actions, /api/v1 routes
    admin/(dashboard)/ # Staff-only console (route group keeps /admin/login outside the auth gate)
    account/           # Customer account area
    legal/             # Terms, Privacy, Refund/Shipping Policy, Prohibited Items, Seller Terms, Customer Agreement
  components/          # UI primitives, layout, and feature-specific components
  lib/
    services/          # Mock* service abstractions (see above) — the seam for real integrations later
    auth/               # Password hashing, JWT sessions, current-user helpers
    validation/         # Zod schemas
    rbac.ts             # Central role → permission matrix
    money.ts             # Integer minor-unit money helpers (never floats)
prisma/
  schema.prisma        # Full data model (see SCHEMA.md for the ER diagram)
  seed.ts               # Demo data
```

## Design decisions worth knowing

- **Money** is always stored as an integer in minor units (kobo/butut/cents/fen) alongside an explicit `Currency`
  enum column — never as a float.
- **The ATG Wallet is ledgered**: `WalletTransaction` rows are append-only and `Wallet.balanceMinor` is only ever
  updated inside the same database transaction as a new `WalletTransaction`, via `walletService.credit()` /
  `.debit()`. Don't write to `balanceMinor` directly anywhere else.
- **RBAC** is centralized in `src/lib/rbac.ts` — every staff page/action calls `requirePermission()` rather than
  re-implementing role checks.

## Roadmap

See **Phase 2–4** in [`ARCHITECTURE.md`](./ARCHITECTURE.md) for what comes after this MVP: real 1688/Taobao/payment/
carrier integrations, the seller marketplace going live end-to-end, and native mobile apps.

## Support

- Email: support@apexterraglobal.com
- Phone / WhatsApp: +234 704 394 5345
