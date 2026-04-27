# ProBoost.gg — Pro Gaming Marketplace

A high-end gaming marketplace for **ARC Raiders** (with multi-game support
designed in) — boosting, coaching, and carry services with a **Pro-Player
Bidding System**, **Admin Marketplace Logic**, full **Payments + Refund flow**,
**Order activity timeline**, **Order chat**, and **Reviews**, built with
Next.js (App Router), Prisma, NextAuth (Auth.js), and PostgreSQL.

> Inspired by skycoach.gg — dark, sleek, gaming-focused UI/UX with the
> ProBoost.gg blue identity.

## Features

### Customer
- High-end services configurator with live pricing
- Order detail page with **activity timeline**, **chat**, **status pill**,
  **payment status**, and refund / cancellation requests
- **Checkout** — Stripe in production, MANUAL provider for local sandbox
- Post-completion **reviews** (1–5★ rating + title + body)
- Pro **application flow** with admin approval

### Pro
- Browse open paid orders, place / update / withdraw bids
- Dashboard with **active assignments**, **bid history**, **earnings**,
  **completed jobs**
- Per-order page with messages and activity scoped to the assigned Pro
- Profile state and Pro application status surfaced on dashboard

### Admin
- Marketplace overview with status counts (open / assigned / in-progress / completed)
- **Search**, **filter by status**, and **sort** (newest / oldest / price ↑↓)
- Per-order page with: **status updates**, **manual Pro assignment**,
  **internal notes** (admin-only), **bid acceptance**, and full **activity log**
- Pro **application queue** with approve / reject + admin notes
- **Refund/cancellation review** queue baked into the order detail page

### Platform
- Role-based access (`USER`, `PRO`, `ADMIN`) enforced by JWT session callback,
  `proxy.ts` (Next.js 16 replacement for `middleware.ts`), and `requireRole`
  helpers for server actions
- Order **conversations** with optional **internal notes** for admins
- Immutable **OrderActivity** log of every state change
- **Payment**, **Transaction** (charge / refund / payout / adjustment), and
  **Review** ledgers for clean accounting
- Stripe webhook handler at `/api/webhooks/payments` with HMAC signature check
- Multi-game catalog at `/games` (ARC Raiders live, others "coming soon")
- FAQ at `/faq`

## Tech stack

- **Frontend/Backend**: [Next.js 16](https://nextjs.org/) (App Router, Server Components, Server Actions, Turbopack)
- **Auth**: [NextAuth.js (Auth.js) v5](https://authjs.dev/) with Google provider + Prisma adapter, JWT sessions
- **Database**: PostgreSQL via [Prisma 6](https://www.prisma.io/)
- **UI**: Tailwind CSS v4 with custom theme tokens, lucide-react icons
- **Validation**: Zod 4
- **Payments**: Pluggable provider — Stripe in production, MANUAL fallback in dev

## Local setup

```bash
cp .env.example .env
docker compose up -d   # local Postgres on :5432
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Then sign in with Google (or use the demo accounts seeded above) and place an order.

### Demo accounts (seeded)

- `admin@proboost.gg` — auto-promoted to ADMIN if listed in `ADMIN_EMAILS`
- `user@proboost.gg` — sample customer with one paid open order
- `raidking@proboost.gg`, `ghost@proboost.gg`, `voidwalker@proboost.gg` — Pros

## Environment variables

See [`.env.example`](./.env.example). Key ones:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Canonical site URL |
| `NEXT_PUBLIC_SITE_URL` | Used for absolute URLs in checkout |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth credentials |
| `ADMIN_EMAILS` | Comma-separated emails auto-promoted to ADMIN on first sign-in |
| `STRIPE_SECRET_KEY` | Enables Stripe checkout when set |
| `STRIPE_WEBHOOK_SECRET` | Verifies the `Stripe-Signature` header on `/api/webhooks/payments` |

## Payments

The payment provider is selected automatically by `getActiveProvider()` in
[`src/lib/payments.ts`](./src/lib/payments.ts):

- If both `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set → **Stripe**
  (real Checkout Session, Stripe webhook signature verified).
- Otherwise → **MANUAL** sandbox provider that redirects to
  `/checkout/[orderId]/manual` with a "Mark as paid" button. Useful for
  developing the post-payment UX without a Stripe account.

Stripe events handled:
- `checkout.session.completed` / `payment_intent.succeeded` → mark paid
- `checkout.session.expired` / `payment_intent.payment_failed` → mark failed

All payment state changes are mirrored into:
- `Order.paymentStatus`
- `Payment` row (one per order)
- `Transaction` ledger entries
- `OrderActivity` log

## Refunds & cancellations

Customers can open a refund/cancellation from the order page. Admin reviews
from the same admin order page and either approves (creates a `REFUND`
transaction, status → `REFUNDED`) or rejects with a note.

## Deployment (Vercel)

1. Push to GitHub.
2. Import the repo in Vercel.
3. Add a production Postgres (Neon/Supabase/Vercel Postgres).
4. Set the env vars listed above (don't forget `STRIPE_*` if using Stripe).
5. The build runs `prisma generate`. Run `prisma migrate deploy` as a one-off
   or add it to a deploy hook before launching.
6. Configure the Stripe webhook endpoint to:
   `https://<your-domain>/api/webhooks/payments`
   with events `checkout.session.completed`, `checkout.session.expired`,
   `payment_intent.succeeded`, `payment_intent.payment_failed`.

### Observability (recommended)

- Add Sentry (`SENTRY_DSN`) for error tracking.
- Add Axiom or Vercel Logs drain for structured logs.
- Add an uptime monitor on `/` and `/api/auth/session`.

## Repo layout

```
src/
  app/
    actions/         # Server actions (orders, payments, refunds, reviews, admin, …)
    api/             # Webhook + auth handlers
    checkout/        # Stripe + manual checkout pages
    dashboard/       # Customer / Pro / Admin dashboards
    games/           # Multi-game catalog
    faq/             # FAQ
    services/arc-raiders/  # Services configurator
  components/        # Shared UI (timeline, chat, refund form, review form, pills…)
  lib/
    payments.ts      # Provider abstraction (Stripe + MANUAL)
    activity.ts      # OrderActivity helpers
    arc-pricing.ts   # Pricing engine
prisma/
  schema.prisma      # Full data model (User, Order, Bid, Payment, Transaction, OrderActivity, Conversation, Message, Review, ProApplication)
  seed.ts            # Seed data
```
