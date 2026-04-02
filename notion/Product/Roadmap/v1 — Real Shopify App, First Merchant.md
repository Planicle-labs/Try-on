# v1 — Real Shopify App, First Merchant

**Timeframe: 2 to 3 weeksGoal: A properly installable Shopify app that a real merchant can install, set up, and use — with billing**

This is where you build real Shopify infrastructure. No more script injection. No more manual setup. A merchant finds your app (or you send them a direct install link), installs it, grants permissions, and has a working try-on button on their product pages with zero theme editing required.

### What to build

**Shopify App Infrastructure:**
- Remix app scaffolded with Shopify CLI (`npm init @shopify/app@latest`)
- OAuth session management with Prisma + PostgreSQL (NeonDB free tier is fine to start)
- App proxy or direct API route for storefront → backend communication
- Theme App Extension with an App Block: “Try On” button renders on product pages without any merchant theme editing
- Webhook handlers: `app/uninstalled`, `orders/create` (for future quota reset), `customers/data_request` (required for App Store compliance)

**Billing:**
- Shopify Billing API integration: one subscription plan at $0/month (free) and one at $49/month
- Usage-based overage line items at $0.15/generation above the free tier limit (50 generations/month)
- Billing approval redirect flow: merchant approves charge → redirected back to app
- Grace period: 7-day free trial before billing activates

**Try-On Flow (improved from v0.5):**
- Photo upload with client-side validation (format, file size max 4MB, basic dimension check)
- A real loading state with progress indication (fake progress bar is fine — just mask the latency)
- Error handling: API failure → human-readable message, not a raw error object
- Basic generation quota display: “You have X free generations remaining this month”
- Result display with a simple before/after toggle

**Merchant Admin Panel (minimal):**
- Embedded in Shopify Admin via App Bridge
- Shows: app status (active/inactive), current plan, generations used this month, basic install guide
- One toggle: enable/disable the try-on button globally across all product pages

**Data:**
- Postgres schema: `merchants` (shop domain, access token, plan, created_at), `generations` (merchant_id, product_id, timestamp, cost)
- No user data stored at all at this stage — generations are anonymous

### What you are NOT building in v1

- The Gemini sizing intelligence layer (v3)
- The ROI dashboard (v2)
- Email capture (v2)
- Per-product configuration (v2)
- Any advanced analytics

### First merchant target

Before v1 is finished, identify your first real beta merchant. The profile you want:
- A small Indian D2C clothing brand on Shopify
- Selling fitted clothing (kurtas, western wear, co-ords — not accessories or shoes)
- Doing at least ₹5L/month in GMV (so they care about returns but won’t make enterprise demands)
- Someone you can reach directly — a friend’s business, a LinkedIn connection, a founder community contact
- Someone who will give you honest feedback, not just be polite because they know you

Get them on a call before v1 ships. Show them the v0.5 prototype. Get a verbal commitment that they’ll install the real app when it’s ready. This person is your most valuable asset in v1.

### Tech stack for v1

```
Framework    : Remix + Shopify CLI
ORM          : Prisma
Database     : PostgreSQL on Supabase (free tier)
Billing      : Shopify Billing API
Extension    : Theme App Extension (App Block)
Auth         : Shopify OAuth (managed by @shopify/shopify-app-remix)
Deployment   : Vercel (upgrade to Pro if needed for edge functions)
Monitoring   : Vercel logs + basic Sentry free tier
```

### v1 success criteria

- [ ]  App installable via direct Partner Dashboard link without any manual steps
- [ ]  Try-on button appearing on product pages without the merchant touching their theme
- [ ]  Billing subscription activating and appearing correctly in Shopify admin
- [ ]  One real merchant has installed the app on their live store
- [ ]  That merchant has completed at least 10 try-on generations from real shoppers
- [ ]  No critical errors in the first 48 hours of live merchant use
- [ ]  App uninstall and reinstall cycle works cleanly (this is a common source of bugs)
- [ ]  Flow tested on mobile browser (most Shopify shoppers are on mobile)
- [ ]  At least 2 non-developer users have seen and reacted to the flow

---

### 🔴 Reflection Period 1 — 1 week

**Review before moving to v1.5:**

- **Funnel:** Click → upload → generate completion rate. Where do users drop?
- **Real inputs:** What photo types show up in production. What breaks quality?
- **Merchant call (30 min):** Top 3 setup confusions. Any customer mentions. Would they recommend it today and why not.
- **Unit economics (real):** Actual cost/gen in production. Profitability at 500 and 2,000 sessions/month.
- **Sizing gap evidence:** 3–5 concrete examples where visuals looked fine but sizing was wrong.

**Write down:** Funnel numbers, cost/gen, merchant’s top 3 changes, and a clear verdict: demo vs decision-changing product.