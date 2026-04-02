# v0.5 — First Shopify Injection

**Timeframe: 3 to 4 daysGoal: Get the try-on pipeline running inside a real Shopify product page, even if it’s ugly and manual**

This is still not a real app. There is no OAuth, no App Store listing, no billing. You are manually injecting a script into a development store to prove that the try-on flow can exist inside the Shopify storefront environment.

### What to build

- [x]  Deploy your v0 backend to Vercel or Railway (two commands — just get it online with a URL)
- [x]  Create a Shopify development store in your Partner Dashboard
- [x]  Manually add a `<script>` tag to a product page template in the theme editor that:
    - [x]  Injects a "Try it on" button next to the Add to Cart button
    - [x]  Opens a simple modal on click
    - [x]  The modal contains the photo upload inputs + a "Generate" button
    - [x]  On generation, shows the output image inside the modal
- [x]  The garment image is hardcoded to the product's featured image URL (pulled from `window.ShopifyAnalytics.meta.product`)
- [x]  No session management, no quota tracking, no consent flow yet — just the raw flow working

### What you are NOT building in v0.5

- Proper Theme App Extension (that comes in v1)
- Any merchant-facing admin panel
- OAuth or session management
- Billing
- The Gemini sizing layer
- A consent flow (document that you know this is missing and why it matters — don’t pretend it isn’t needed)

### How to evaluate v0.5

Show the working flow to at least 2 people who have actually shopped clothing online. Not developers. Not friends who will be polite. Find someone who has genuinely returned a clothing order because “it didn’t fit how I expected.”

Ask them two questions only:
1. Would you use this on a product page you were considering buying from?
2. What would make you not use it? (This question matters more than question 1)

### Tech stack additions for v0.5

```
Deployment   : Vercel (free tier, zero config)
Script inject: Manual via Shopify theme editor (Customize → theme.liquid)
Garment image: window.ShopifyAnalytics.meta.product.featured_image
Modal UI     : Vanilla JS + minimal inline CSS
```

### v0.5 success criteria

- [x]  Try-on flow completing end-to-end inside a live development store product page
- [x]  Garment image pulls automatically from the Shopify product — no manual upload needed for the garment

---