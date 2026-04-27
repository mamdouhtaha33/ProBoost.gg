# ProBoost.gg — Pro ARC Raiders Marketplace

A high-end gaming marketplace for **ARC Raiders** boosting, coaching, and carry services with a **Pro-Player Bidding System** and **Admin Marketplace Logic**, built with Next.js (App Router), Prisma, NextAuth (Auth.js), and PostgreSQL.

> Inspired by skycoach.gg — dark, sleek, gaming-focused UI/UX.

## Features

- **High-end ARC Raiders services UI** with a dynamic pricing form
  - Boosting (rank → rank, with high-tier multiplier)
  - Coaching (per hour)
  - Carry & Co-op (per run)
  - Add-ons, region surcharge, and live price preview
- **Pro-Player Bidding System**
  - Pros sign in with Google and get a dedicated dashboard
  - Pros browse `OPEN` orders and submit/update a single bid per order
- **Admin Marketplace Logic**
  - Admins see all bids per order
  - Admin **Accepts a bid** → atomic transaction locks the order to that Pro, sets the final price, and rejects other pending bids
- **Role-based access** (`USER`, `PRO`, `ADMIN`) enforced by:
  - JWT session callback
  - `proxy.ts` (Next.js 16 replacement for `middleware.ts`)
  - `requireRole` helper for server actions
- **Self-service Pro upgrade** (User → Pro) and **bootstrap admin promotion** via `ADMIN_EMAILS` env var
- **Dark gaming UI**: gradient ember accents, scanline overlay, glassy cards

## Tech stack

- **Frontend/Backend**: [Next.js 16](https://nextjs.org/) (App Router, Server Components, Server Actions)
- **Auth**: [NextAuth.js (Auth.js) v5](https://authjs.dev/) with Google provider + Prisma adapter, JWT sessions
- **DB**: PostgreSQL via [Prisma 6](https://www.prisma.io/)
- **Styling**: Tailwind CSS v4 + custom gaming theme tokens, [lucide-react](https://lucide.dev) icons
- **Validation**: [zod](https://zod.dev)
- **Deployment**: Vercel

## Project layout

```
prisma/
  schema.prisma         # User (Role enum), Account/Session, Order, Bid, ...
  seed.ts               # Sample admin/pro/user + a demo order with bids
src/
  auth.ts               # NextAuth config (Google + Prisma adapter, role callbacks)
  proxy.ts              # Next.js 16 proxy (middleware) for /dashboard guards
  lib/
    prisma.ts           # PrismaClient singleton
    arc-pricing.ts      # ARC Raiders pricing engine + zod schemas
    utils.ts            # cn(), formatPrice(), timeAgo()
  components/
    site-header.tsx     # Auth-aware nav
    services-form.tsx   # Dynamic pricing form (client)
    bid-form.tsx        # Pro bid form (client)
    order-status-pill.tsx, become-pro-button.tsx, ...
  app/
    page.tsx                              # Marketing homepage
    services/arc-raiders/page.tsx         # ARC Raiders service configurator
    login/page.tsx                        # Google sign-in
    actions/orders.ts                     # createOrder, placeBid, acceptBid, ...
    api/auth/[...nextauth]/route.ts       # NextAuth handlers
    dashboard/
      layout.tsx                          # Sidebar + role gating
      page.tsx                            # Customer overview
      pro/page.tsx                        # Pro: open orders + bid form
      admin/page.tsx                      # Admin: all orders
      admin/orders/[id]/page.tsx          # Admin: accept bid
```

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Spin up Postgres (local)

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` with the credentials in `docker-compose.yml`. The default `DATABASE_URL` in `.env.example` points at it.

### 3. Configure environment

Copy `.env.example` → `.env` and fill in:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/arc_marketplace?schema=public"
AUTH_SECRET="$(openssl rand -base64 32)"
AUTH_GOOGLE_ID="your-google-oauth-client-id"
AUTH_GOOGLE_SECRET="your-google-oauth-client-secret"
ADMIN_EMAILS="you@example.com"   # auto-promoted to ADMIN on first sign-in
```

Get Google OAuth credentials at <https://console.cloud.google.com/apis/credentials>. Authorized redirect URI:

```
http://localhost:3000/api/auth/callback/google
```

### 4. Migrate & seed

```bash
npm run db:migrate:dev   # creates schema
npm run db:seed          # demo admin/pro/user + a sample order with bids
```

### 5. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

## Bidding workflow

1. **User → place order**: `POST /services/arc-raiders` (server action `createOrder`).
   - Server recomputes price from form options (clients can't set price directly).
   - Creates `Order { status: OPEN }`.
2. **Pro → place bid**: `POST` server action `placeBid`.
   - Requires role `PRO` or `ADMIN`.
   - One bid per pro per order (`@@unique([orderId, proId])`); resubmitting updates the existing bid.
3. **Admin → accept bid**: `POST` server action `acceptBid` (admin-only).
   - Atomic `prisma.$transaction`:
     - Lock `Order` to the winning Pro: `proId`, `acceptedBidId`, `finalPrice`, `status = ASSIGNED`.
     - Mark winning `Bid.status = ACCEPTED`.
     - Mark all other pending bids `REJECTED`.

## Deploying to Vercel

1. Provision a managed Postgres (Vercel Postgres / Neon / Supabase).
2. Set env vars on Vercel:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
   - `NEXTAUTH_URL=https://<your-domain>`
   - `ADMIN_EMAILS=<comma-separated admins>`
3. Add `https://<your-domain>/api/auth/callback/google` as an authorized redirect URI in Google Cloud Console.
4. Deploy. The `postinstall` script runs `prisma generate`. Run `prisma migrate deploy` as a build step (or via the Vercel CLI) the first time.

## Scripts

| script                  | description                                      |
| ----------------------- | ------------------------------------------------ |
| `npm run dev`           | Next.js dev server                               |
| `npm run build`         | Production build                                 |
| `npm run start`         | Production server                                |
| `npm run lint`          | ESLint                                           |
| `npm run typecheck`     | `tsc --noEmit`                                   |
| `npm run db:migrate:dev`| Create dev migration                             |
| `npm run db:migrate`    | Apply migrations (prod)                          |
| `npm run db:push`       | Sync schema without migration files              |
| `npm run db:seed`       | Seed sample data                                 |

## License

MIT — see [LICENSE](./LICENSE) (add as needed).
