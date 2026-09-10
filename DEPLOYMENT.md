# Deploying ATG Mall to Vercel + a custom domain

This walks through taking the codebase from "files on disk" to "live at
`https://yourdomain.com`" on Vercel, with a managed Postgres database. It
assumes you haven't deployed a Next.js app before — skip steps you've already
done.

Nothing here can be run from this sandbox (no access to GitHub, Vercel, or a
domain registrar), so this is the checklist to follow yourself. Come back if
any step errors — paste the exact error and I'll help debug it.

---

## 0. What you'll end up with

- Code hosted on **GitHub** (Vercel deploys from a Git repo).
- A **Postgres database** on a managed provider (Neon is the recommended
  pairing with Vercel — serverless, generous free tier, one-click from
  Vercel's own integrations marketplace).
- The app running on **Vercel**, first at a free `*.vercel.app` URL, then at
  your own domain once it's connected.

---

## 1. Push the code to GitHub

```bash
cd atg-mall
git init
git add .
git commit -m "Initial commit — ATG Mall MVP"
```

Create a new **private** repository on GitHub (uninitialized — no README/
.gitignore, since this already has both), then:

```bash
git remote add origin https://github.com/<your-username>/atg-mall.git
git branch -M main
git push -u origin main
```

## 2. Create a production Postgres database

**Neon (recommended):**

1. Sign up at [neon.tech](https://neon.tech).
2. Create a new project (any region close to your users — Neon has an EU/US
   selection; pick the closest to Nigeria/Gambia if given the option).
3. Copy the connection string it gives you — it looks like:
   `postgresql://<user>:<password>@<host>/<db>?sslmode=require`

(Vercel Postgres or Supabase both work identically — you just need any
Postgres connection string that accepts external connections.)

## 3. Import the project into Vercel

1. Sign up / log in at [vercel.com](https://vercel.com).
2. **Add New → Project** → import the `atg-mall` GitHub repo.
3. Framework preset should auto-detect as **Next.js** — leave build settings
   as default (`npm run build`).
4. Before the first deploy, add these **Environment Variables** (Project →
   Settings → Environment Variables), matching `.env.example`:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Neon connection string from step 2 |
   | `AUTH_SECRET` | a long random string — generate with `openssl rand -base64 48` |
   | `AUTH_COOKIE_NAME` | `atg_session` |
   | `NEXT_PUBLIC_APP_URL` | your Vercel URL for now, e.g. `https://atg-mall.vercel.app` (you'll update this in step 7) |
   | `NEXT_PUBLIC_APP_NAME` | `ATG Mall` |
   | `NEXT_PUBLIC_PARENT_COMPANY` | `Apex Terra Global Limited` |
   | `NEXT_PUBLIC_SUPPORT_EMAIL` | `support@apexterraglobal.com` |
   | `NEXT_PUBLIC_SUPPORT_PHONE` | `+234 704 394 5345` |
   | `NEXT_PUBLIC_CORPORATE_SITE` | `https://apexterraglobal.com` |

   Leave the payment/notification/1688/Taobao keys blank for now — those are
   Phase 2, once you have a real provider to connect.

5. Click **Deploy**. `npm install` runs `prisma generate` automatically
   (via the `postinstall` script), then `next build` compiles the app.

If the build fails on the very first deploy, it's most likely a TypeScript
error `npm run typecheck` would have caught — this codebase was hand-written
without ever running a compiler (see the README's warning), so budget time
for a small fix-and-redeploy loop here.

## 4. Create the database schema

Run this **once**, from your own machine, pointed at the production
database — Vercel's build step does not run migrations for you:

```bash
# In the project folder, temporarily set DATABASE_URL to the Neon string:
DATABASE_URL="postgresql://...neon-connection-string..." npx prisma migrate deploy
```

## 5. Seed production reference data

Do **not** run `npm run db:seed` against production — that script creates
fake demo customers and a fabricated sample order, meant only for local
development. Instead, run the production seed, which creates only real
structural data (categories, the warehouse, starting shipping rates and
delivery zones) plus **one real admin account** you control:

```bash
DATABASE_URL="postgresql://...neon-connection-string..." \
SEED_ADMIN_EMAIL="you@apexterraglobal.com" \
SEED_ADMIN_PASSWORD="choose-a-strong-password-12+chars" \
SEED_ADMIN_NAME="Alabi Olasesan" \
npm run db:seed:prod
```

Sign in at `https://<your-vercel-url>/admin/login` with that email/password,
then add real products, suppliers and staff accounts from the admin console
— everything under Admin → Products/Categories/Suppliers/etc. is fully
functional, so there's no need to hand-edit the database for day-to-day
catalog work.

## 6. Smoke-test the `.vercel.app` URL before touching DNS

- Homepage loads, destination switcher works.
- `/admin/login` → sign in with the seeded admin.
- Add a product from Admin → Products, confirm it shows on `/shop`.
- Register a test customer account, add the product to cart, checkout with
  "Cash on Delivery" (no real payment provider is connected yet — see the
  README on what's mocked by design).
- `/track` with any tracking number should render the "not found" state
  cleanly (there's no seeded order in production data).

Fix anything broken here before pointing a real domain at it.

## 7. Buy and connect the domain

Since you're using a **new dedicated domain** (not a subdomain of
apexterraglobal.com):

1. **Register it.** Easiest path: buy it directly through Vercel — Project →
   Settings → Domains → type the domain → if it's available, Vercel offers
   to register and auto-configure it in one step, at cost (no markup).
   Otherwise, register it anywhere (Namecheap, Cloudflare Registrar, etc.)
   and connect it manually:

2. **Add it in Vercel:** Project → Settings → Domains → Add → enter e.g.
   `atgmall.com`. Vercel shows you the DNS records to add:
   - Apex domain (`atgmall.com`): an **A** record → `76.76.21.21`
     (or Vercel may offer **ALIAS/ANAME** if your registrar supports it)
   - `www.atgmall.com`: a **CNAME** record → `cname.vercel-dns.com`

3. **Add those records at your registrar's DNS settings** (wherever you
   registered the domain, if not through Vercel directly).

4. Wait for propagation — usually minutes, occasionally a few hours. Vercel
   shows a green check on the domain once it's verified, and automatically
   issues a free SSL certificate.

5. Decide whether the bare domain or `www.` is canonical, and set the other
   to redirect to it (Vercel's domain settings has a toggle for this).

## 8. Point the app at its real domain

Once the domain resolves:

1. Update `NEXT_PUBLIC_APP_URL` in Vercel's environment variables to the
   real domain, e.g. `https://atgmall.com`.
2. Redeploy (Vercel → Deployments → ⋯ → Redeploy) so the new value is baked
   into the build — this feeds the `metadataBase`, sitemap, robots.txt and
   Open Graph tags in `src/app/layout.tsx`.
3. Re-run the smoke test from step 6 on the real domain.

---

## After launch

- **Rotate `AUTH_SECRET`** if it was ever shared outside your own
  environment variables — anyone with it can forge session cookies.
- **Phase 2 integrations** (real payments, real 1688/Taobao data, real
  carrier rates, real email/SMS/WhatsApp) each have a documented seam in
  `src/lib/services/*` — see `ARCHITECTURE.md` for the roadmap.
- Keep using `npx prisma migrate dev` locally when the schema changes, then
  `npx prisma migrate deploy` against production the same way as step 4.
