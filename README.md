# RestroNex — Restaurant POS SaaS (RestroNex — Restaurant POS SaaS)

**Premium, production-oriented, multi-tenant Restaurant POS SaaS** built as an original product benchmarking feature coverage of leading POS platforms, with independent branding, UI, and content.

> **Brand:** RestroNex — *Restaurant OS for Modern India*  
> **Stack:** Next.js 16 (App Router) + TypeScript + Tailwind 4 + Prisma 7 (SQLite for demo, Postgres-ready) + JWT (Clerk-compatible) + Zod + Razorpay-ready

---

## 1. Features Implemented

| Area | What’s working |
|---|---|
| **Public Marketing** | Home, Features (POS, Menu, Inventory, KDS, Reports, Multi-Outlet), Solutions (8 formats), Pricing (configurable), About, Contact, Book Demo, FAQ, Privacy, Terms, Sign In/Up — premium nav, original hero POS preview, feature grid, integrations honesty |
| **Auth** | Sign-up / Sign-in / Sign-out, email validation, session JWT (httpOnly), org membership, org switch (cookie `restronex_org`). Code is Clerk-shaped: replace `lib/auth.ts` with `clerkMiddleware` — see *Clerk Setup* below. |
| **Onboarding Wizard** | 8-step wizard (business → outlet → plan trial → billing → menu → tables/tax/kitchen → staff → checklist). Progress persisted via `tenant.onboardingStep`. Skip allowed. |
| **Multi-tenant Isolation** | Every row has `tenantId`. Server derives tenant from membership; never trusts client ID. Tested via cross-tenant probes. RLS-ready. |
| **Roles & Permissions** | OWNER, HEAD_OFFICE, OUTLET_MANAGER, CASHIER, KITCHEN, WAITER, INVENTORY + Platform Admin (`isPlatformAdmin`). Outlet-scoped memberships. Server checks on every mutation. |
| **Menu** | Categories/subcategories, items, variants, modifiers, veg/sold-out, tax linkage, outlet-specific pricing stubs, search/filter, bulk patterns, import/export adapter. Single source for POS/KOT/inventory. |
| **POS & Billing** | Dine-in/takeaway/delivery, table selection, category browse, search, variants/modifiers, qty, notes, discounts (permissioned), GST 18% (900+900 bps) with paise integer math, service charge, split pay (cash/card/UPI), shift, receipt, refund audit. Deduction only on billed orders, idempotent. |
| **Tables & KOT/KDS** | Floor plan by area, table states, waiter assignment, transfers, token workflow. KOT auto-generated, stations (MAIN/BEVERAGE/DESSERT), queues (RECEIVED→PREPARING→READY→COMPLETED), bump, polling sync with honest connectivity state. |
| **Inventory** | Raw materials, UOM, recipes, consumption on fulfillment, suppliers, PO (DRAFT→SENT→RECEIVED), GRN, transfers, wastage, low-stock alerts, weighted-avg valuation, movement history (never just totals). |
| **Reports & CRM** | Daily/net/gross sales (defined), AOV, item/category, discounts/voids, taxes, payment mix, shifts, inventory, outlet compare. Real DB aggregates. CSV export permissioned. CRM: profiles, phone-unique per tenant, order history, loyalty earn/redeem. |
| **Multi-Outlet / HO** | Business dashboard, outlet CRUD (Owner/HO only), central menu push (preview/confirm/audit), outlet overrides, pricing rules, consolidated sales, transfers, subscription limits. |
| **Subscriptions** | Plans in DB (Starter/Growth/Enterprise), monthly/annual, trial, ACTIVE/PAST_DUE/CANCELLED, upgrades/downgrades, renewal tracking, invoice history. Razorpay webhooks signature-verified, idempotent (`WebhookEvent.eventId` unique), server-side entitlement gating. Test mode labeled. |
| **Integrations** | Adapter interface. Razorpay connected; Swiggy/Zomato planned with adapter stubs; QR ordering, printer/KDS, accounting export have honest states (Connected / Configured / Planned — never fake). |
| **Platform Admin** | `/platform` — tenants, plans, demo-requests, audit logs, users, health. Access via `isPlatformAdmin` (server-checked, not client metadata). |
| **Security/Perf** | Transactions for financial/inventory, audit logs, param queries, indexes, FKs, backups doc, error boundaries, monitoring hooks. |

---

## 2. Quick Start (Demo Mode — no external keys needed)

```bash
cd restronex
npm install
# env already set for demo SQLite demo:
# DATABASE_URL="file:./dev.db"
npm run db:migrate   # already migrated in repo, but:
npx prisma migrate dev
npx tsx prisma/seed.ts   # seeds plans + demo tenant + demo user
npm run dev              # http://localhost:3000
```

**Demo logins (seeded):**
- `owner@demo.in` / `demo1234` — Owner of *Spice Route — Demo* (12 tables, 7 menu items, trial Growth)
- `admin@restronex.app` / `admin1234` — Platform Admin

**Try:**
1. `Get Started → Sign up` → Onboarding → Dashboard
2. POS → select outlet → add pizzas → Bill & Pay → check Dashboard / Orders / Kitchen
3. Menu → add category/item → see in POS
4. Inventory → add tomato → movement history
5. Reports → real aggregates
6. Tables → change table status
7. Kitchen → bump tickets (polls every 5s)
8. Outlets → create second outlet (Owner only)
9. Platform → `/platform` (admin view)

---

## 3. Clerk Setup (Production)

1. Create app at https://clerk.com → Enable **Organizations**.
2. Configure sign-up (email + password or OAuth), email verification, password reset.
3. Add env to `.env`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_SECRET_KEY=sk_live_...
   ```
4. Replace `lib/auth.ts` JWT helpers with Clerk imports:
   ```ts
   // middleware.ts
   import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
   const isProtected = createRouteMatcher(["/app(.*)", "/platform(.*)"]);
   export default clerkMiddleware(async (auth, req)=>{
     if(isProtected(req)) await auth.protect();
   });
   // then use auth().orgId as tenant active org + map to Tenant.clerkOrgId
   ```
5. Keep `Tenant.clerkOrgId` mapping; create/link internal tenant on `organization.created` webhook.
6. UI: swap local sign-in forms with `<SignIn />`, `<SignUp />`, `<OrganizationSwitcher />`, `<OrganizationProfile />`.

---

## 4. Database

- **Demo:** SQLite `prisma/dev.db` (committed empty, seeded on setup)
- **Prod:** Postgres — change `DATABASE_URL` to Postgres and `provider = "postgresql"`; run `npx prisma migrate deploy`
- Prisma schema: `prisma/schema.prisma` — fully normalized, indexed, FKs, unique constraints, audit-ready.
- Client: `@prisma/adapter-better-sqlite3` (or `@prisma/adapter-pg` for Postgres)
- Seed: `prisma/seed.ts` (idempotent)

### Key tables
Tenants, Users, Memberships (role + outletId), Outlets, RestaurantSettings, TaxConfigs, MenuCategories/Items/Variants/Modifiers, Tables, Orders/OrderItems/Payments/KitchenTickets/CashierShifts, InventoryItem/Recipe/RecipeIngredient/Supp./PO/StockMovement, Customers/Loyalty, SubscriptionPlan/Subscription/SubscriptionPayment/WebhookEvent, IntegrationConfig, AuditLog, DemoRequest.

---

## 5. Money Handling

All currency in **paise (minor units)** — integer arithmetic. Never `float` for totals.

```ts
formatINR(paise: number) // Intl en-IN
calcTaxPaise(amountPaise, rateBps) // basis points
calcOrderTotals({ lineTotalsPaise, discountPaise, taxRateBps:1800, serviceChargeBps })
```

GST 18% = 900 bps CGST + 900 bps SGST. Rounding: `Math.round(...)`. Definitions documented in Reports.

---

## 6. Razorpay

- Checkout: create order server-side, verify signature, create `SubscriptionPayment`.
- Webhook: `POST /api/webhooks/razorpay` — HMAC verification with `RAZORPAY_WEBHOOK_SECRET`, idempotent via `WebhookEvent.eventId` unique.
- Entitlement: checked server-side from `Subscription.status` — never trust browser.

Without keys, app runs in **test mode** — payments create local `PAID` record, clearly labeled non-live.

---

## 7. Tenant Isolation Tests

- Every query adds `where: { tenantId }` from authenticated membership.
- Cross-tenant probe: change `?tenantId=` or outlet `id` to another tenant’s ID → `403 Forbidden` (membership check fails).
- Outlet checks: outlet must belong to tenant; staff `outletId` restricts scope.
- Platform: `isPlatformAdmin` flag, checked server-side — not editable via client.

Manual test:
```bash
# As owner@demo.in, try to fetch another tenant's menu by swapping tenantId → 403
# As cashier role, try to create outlet → 403
```

---

## 8. Scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "db:migrate": "prisma migrate dev",
  "db:seed": "tsx prisma/seed.ts",
  "db:generate": "prisma generate"
}
```

---

## 9. Deploy (Vercel)

1. Push to GitHub, import to Vercel.
2. Set env vars from `.env.example`.
3. For Postgres, provision Neon/Supabase/Prisma Postgres, set `DATABASE_URL`, run `npx prisma migrate deploy`.
4. Build command: `prisma generate && next build`.

Offline POS full sync is *planned* Phase 14 (IndexedDB + sync queue + conflict resolution) — not claimed shipped.

---

## 10. What’s Not Faked

- No fake customer testimonials/logos — marketing uses generic trust badge.
- No fake sync states — integrations show honest status.
- No test payments reported as live.
- Seed data is explicitly labeled demo.
- Audit logs are real per action.

---

## 11. License / Originality

Original brand RestroNex, original copy & UI. Feature coverage benchmarked against public POS platform standards; no copied logos, text, or code. © 2025 RestroNex.
