# V1 Tasks — Real Shopify App, First Merchant

## Phase 1: Shopify App Scaffold & Auth
- [x] Scaffold app with `npm init @shopify/app@latest` in `v1/try-on/`
- [x] Switch Prisma datasource from SQLite to NeonDB PostgreSQL
- [x] Configure `.env` with NeonDB `DATABASE_URL` + `DIRECT_URL`
- [x] Run `npx prisma migrate dev --name init`
- [x] Verify OAuth flow with dev store (install → grant → redirect)

## Phase 2: Database Schema
- [x] Add `Merchant` model (shopDomain, accessToken, plan, isActive, trialEndsAt)
- [x] Add `Generation` model (merchantId, productId, inputImageUrl, resultImageUrl, costUSD, status)
- [x] Run `npx prisma migrate dev --name add_merchant_generation`
- [x] Verify tables in NeonDB dashboard

## Phase 3: Webhook Handlers
- [x] Enhance `app/uninstalled` — delete Merchant + cascaded Generations
- [x] Add `orders/create` stub for future quota reset
- [x] Add `customers/data_request` — compliance: "no data stored"
- [x] Add `customers/redact` — compliance: acknowledge
- [x] Add `shop/redact` — compliance: clean up merchant data
- [x] Register new webhooks in `shopify.app.toml`

## Phase 4: Theme App Extension
- [x] Scaffold extension with `shopify app generate extension`
- [x] Build `try-on-button.liquid` (App Block on product pages)
- [x] Build `try-on-widget.js` (modal, upload, API call, result display)
- [x] Build `try-on-widget.css` (widget styles, mobile-responsive)
- [x] Client-side validation: format (JPG/PNG), max 4MB, dimension check
- [x] Loading state with animated progress bar
- [x] Result display with before/after toggle
- [x] Error handling with human-readable messages
- [ ] Test on dev store product page

## Phase 5: App Proxy / API Route + Cloudflare R2
- [ ] Create `api.proxy.$` route for storefront → backend
- [ ] Set up Cloudflare R2 bucket + credentials
- [ ] Build `r2.server.ts` — upload/delete images via S3-compatible API
- [ ] Upload person photo to R2 before Fashn.ai call
- [ ] Integrate Fashn.ai VTON API call (with R2 input URL)
- [ ] Store result image in R2
- [ ] Record generation in DB with R2 URLs
- [ ] Validate merchant session and enforce quota (50 free/month)
- [ ] Return R2 result URL to widget

## Phase 6: Billing (Shopify Billing API)
- [ ] Implement free plan ($0/mo, 50 gens) and pro plan ($49/mo)
- [ ] Usage-based overage at $0.15/gen above free tier
- [ ] 7-day free trial implementation
- [ ] Billing approval redirect flow
- [ ] Billing status check on each generation request

## Phase 7: Merchant Admin Panel
- [ ] Dashboard (`app._index.tsx`): status, plan, usage, install guide
- [ ] Settings (`app.settings.tsx`): global enable/disable toggle
- [ ] Embed in Shopify Admin via App Bridge
- [ ] Quota display: "X of 50 generations used this month"

## Phase 8: Try-On Flow Polish
- [ ] Quota display on storefront: "You have X free generations remaining"
- [ ] Mobile-responsive widget design
- [ ] Performance optimization (image compression before upload)
- [ ] Error boundary for API failures

## Deployment & Verification
- [ ] Deploy to Vercel
- [ ] Configure R2 env vars in production
- [ ] Install on dev store via Partner Dashboard link
- [ ] Full OAuth cycle test
- [ ] Theme Extension renders without theme editing
- [ ] Billing flow end-to-end test
- [ ] Uninstall → reinstall clean cycle
- [ ] Mobile browser testing
- [ ] Identify and contact first beta merchant
