# v2.5 — Hardening, Quality Audit, India-Specific Tuning

**Timeframe: 2 weeksGoal: Make the app production-ready, not just demo-ready**

This is the unsexy version that determines whether the product survives its first month in the App Store. Every unhandled edge case you discover and fix now saves you a 1-star review later.

### What to build / fix

**Performance:**
- Load test the full generation pipeline: use k6 or Locust to simulate 100 concurrent sessions
- Identify and fix the first bottleneck (it will likely be the VTON API rate limit or your Postgres connection pool)
- Add a generation queue with Redis or Upstash if API rate limits are being hit: users see “your try-on is queued” rather than a timeout error
- Image optimisation: compress all output images before serving (Sharp on the server side, target under 300KB per result)

**India-specific model quality audit:**
- Generate 50 test cases specifically using:
- Indian skin tone range (Fitzpatrick scale 4-6 specifically)
- Indian clothing styles: kurta, salwar, saree blouse, ethnic co-ords, Western fusion
- Realistic Indian product photography (often lower quality, different lighting, non-white backgrounds)
- Document and categorise failure modes
- If the VTON model consistently fails on sarees or drape-based garments, add a visible “best for fitted garments” disclaimer rather than showing bad output
- Test with mobile camera selfies specifically — Indian shoppers are predominantly mobile

**Error handling and edge cases:**
- Every API call must have a timeout, a retry (1x), and a fallback message
- What happens when fal.ai is down? Your app should degrade gracefully (hide the try-on button or show “temporarily unavailable”), not show a broken UI
- What happens if a merchant uninstalls mid-session? Handle the webhook and clean up their data
- Test the billing edge cases: what if a merchant’s payment fails? What if they downgrade mid-billing-cycle?

**Security audit (basic):**
- Ensure generation API endpoints validate the Shopify session token on every request
- Ensure you are not exposing other merchants’ data via ID enumeration (e.g., `/api/generations/123` should return 403 if generation 123 belongs to a different merchant)
- Ensure all user photo uploads are validated server-side (not just client-side) for file type and size
- Add rate limiting to your generation endpoint: max 20 requests per user IP per hour

**Compliance documentation:**
- Write your Privacy Policy: data collected, retention periods, user rights, processor list
- Write your Biometric Data Policy: how photos are handled, that they are transitorily processed, the deletion guarantee
- Add explicit consent checkbox to the photo upload flow — this must be unbundled from the try-on action itself
- Add a Terms of Service for merchants
- Document your GDPR Article 28 processor relationships: fal.ai/Fashn.ai, Supabase, Vercel

### v2.5 success criteria

- [ ]  App handles 100 concurrent sessions without timeouts
- [ ]  Graceful degradation when fal.ai is unavailable
- [ ]  All security checks passing (no ID enumeration, session validation on all endpoints)
- [ ]  Privacy Policy and Biometric Data Policy written and linked from the app
- [ ]  Consent checkbox in the photo upload flow
- [ ]  India-specific quality audit completed and failure modes documented
- [ ]  Rate limiting active on generation endpoints

---

### 🔴 Reflection Period 2.5 — 3 to 4 days

**Go / no-go before App Store submission:**

- [ ]  Clean install + uninstall. No manual steps.
- [ ]  Required webhooks implemented, including GDPR.
- [ ]  Privacy Policy + Biometric Data Policy URLs live.
- [ ]  Theme App Extension only. No script injection.
- [ ]  Billing flows tested end-to-end.
- [ ]  Screenshots (3+) and 60–90s demo video ready.
- [ ]  Listing copy is benefit-led and matches actual behavior.

**Merchant truth test (3–5 calls):** Would they miss it tomorrow. If not, pause and fix the core value.

**Write down:** Any known review risks and the first likely revision you expect from Shopify.