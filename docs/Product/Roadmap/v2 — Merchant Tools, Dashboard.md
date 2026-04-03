# v2 — Merchant Tools, Dashboard, Onboarding

**Timeframe: 3 weeksGoal: Make the app self-serve and give merchants the data they need to justify keeping it**

The $249/mo price point lives or dies on the ROI dashboard. A merchant will not pay that amount unless they can clearly see it generating more than $249/mo in value. This version builds the evidence layer.

### What to build

**Merchant Onboarding Flow (complete rewrite):**
- A step-by-step onboarding wizard in the admin panel:
- Step 1: Confirm the app block is added to the product page template (with visual guide)
- Step 2: Add sizing data for your top 5 products (guided, with progress bar)
- Step 3: Preview how the try-on button looks on your store (live preview)
- Step 4: Choose your plan
- Target: merchant goes from install to first customer-facing try-on in under 20 minutes
- Track time-to-first-generation as a core metric from this version forward

**ROI Analytics Dashboard:**
- Implement Web Pixels API: track custom events `vton:opened`, `vton:generated`, `vton:size_selected`, `vton:add_to_cart_after`
- Event pipeline: Shopify Web Pixel → your backend API endpoint → Postgres `events` table
- Dashboard shows:
- Conversion rate: sessions with try-on vs sessions without (cohort comparison — be careful with attribution language)
- Estimated return rate impact: pull refund webhooks, show delta before/after app install
- Generation usage: daily/weekly generation count, approaching quota warnings
- Top products by try-on engagement
- Important: label all metrics as “correlation” not “causation” — you cannot prove the try-on caused the conversion. Don’t claim you can. Merchants will trust you more for being honest.

**Email Capture (merchant’s marketing list):**
- During the try-on flow, after the user sees their result, show a single opt-in: “Save your results and get size recommendations for future orders — enter your email”
- This is a value-exchange opt-in, not a dark pattern
- On submission, call Klaviyo or Resend API with the merchant’s API key (merchant provides this in settings)
- The email goes into the merchant’s list, not yours. This is their asset.
- Explicit consent checkbox, unbundled from the try-on (user can see their result without giving email)

**Tiered Feature Gating:**
- Implement feature flags per plan level:
- Free: 50 generations/month, no dashboard, no email capture, no sizing intelligence
- Starter ($49): 500 generations/month, basic dashboard (usage only), sizing intelligence
- Growth ($149): 2,000 generations/month, full ROI dashboard, email capture
- Pro ($249): unlimited generations, Merchant Studio, priority support, all features

**Merchant Studio (Pro only):**
- Let merchants take any product + stock model combination and export a marketing-ready image
- Stock models: a set of pre-generated diverse body type models stored in Cloudflare R2
- Merchant selects product + model → VTON generation → download PNG at full resolution
- Add a subtle watermark in the free/starter plan, remove in Pro

### v2 success criteria

- [ ]  3 merchants onboarded using only the wizard (no assistance from you)
- [ ]  Time-to-first-generation measured and below 20 minutes average
- [ ]  Dashboard showing live cohort data (even if the sample size is small)
- [ ]  Email capture delivering first leads to at least one merchant’s Klaviyo list
- [ ]  Feature flags working correctly across all four plan tiers
- [ ]  First merchant upgrading from free to a paid tier (even if you nudge them manually)

---

### 🔴 Reflection Period 2 — 1 week

**Answer before moving to v2.5:**

- **Self-serve test:** Fresh install on a new dev store using only the wizard. Time-to-first-generation. Top 3 confusion points.
- **$249 value test:** If the dashboard were the only proof, would you renew. What single KPI must be unmistakably visible.
- **Privacy check:** List all stored data. Confirm no user photos or measurements leak into logs. Policies drafted.
- **Competitors:** Scan App Store pricing + 1–2 star reviews. List the top 5 complaints to avoid.

**Write down:** Time-to-first-generation, top issues to fix, and whether the dashboard justifies paid tiers.